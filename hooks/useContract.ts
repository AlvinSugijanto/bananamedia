"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  useCurrentAccount,
  useIotaClient,
  useSignAndExecuteTransaction,
  useIotaClientQuery,
} from "@iota/dapp-kit"
import { Transaction } from "@iota/iota-sdk/transactions"
import type { IotaObjectData } from "@iota/iota-sdk/client"
import { TESTNET_PACKAGE_ID } from "@/lib/config"

// ============================================================================
// CONTRACT CONFIGURATION
// ============================================================================

const PACKAGE_ID = TESTNET_PACKAGE_ID
export const CONTRACT_MODULE = "social_media"
export const CONTRACT_METHODS = {
  CREATE_PROFILE: "create_profile",
  UPDATE_PROFILE: "update_profile",
  CREATE_POST: "create_post",
  LIKE_POST: "like_post",
  UNLIKE_POST: "unlike_post",
  CREATE_COMMENT: "create_comment",
  FOLLOW_USER: "follow_user",
  SHARE_POST: "share_post",
} as const

// ============================================================================
// DATA EXTRACTION
// ============================================================================

export interface UserProfile {
  id: string
  owner: string
  username: string
  bio: string
  follower_count: number
  following_count: number
  post_count: number
  created_at: number
}

export interface Post {
  id: string
  author: string
  content: string
  like_count: number
  comment_count: number
  created_at: number
  likes: string[]
}

export interface Comment {
  id: string
  post_id: string
  author: string
  content: string
  created_at: number
}

function extractUserProfile(data: IotaObjectData): UserProfile | null {
  if (data.content?.dataType !== "moveObject") return null
  const fields = data.content.fields as any
  if (!fields) return null

  return {
    id: data.objectId,
    owner: fields.owner || "",
    username: fields.username || "",
    bio: fields.bio || "",
    follower_count: Number(fields.follower_count || 0),
    following_count: Number(fields.following_count || 0),
    post_count: Number(fields.post_count || 0),
    created_at: Number(fields.created_at || 0),
  }
}

function extractPost(data: IotaObjectData): Post | null {
  if (data.content?.dataType !== "moveObject") return null
  const fields = data.content.fields as any
  if (!fields) return null

  return {
    id: data.objectId,
    author: fields.author || "",
    content: fields.content || "",
    like_count: Number(fields.like_count || 0),
    comment_count: Number(fields.comment_count || 0),
    created_at: Number(fields.created_at || 0),
    likes: fields.likes || [],
  }
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export interface ContractState {
  isLoading: boolean
  isPending: boolean
  hash: string | undefined
  error: Error | null
}

export interface ContractActions {
  createProfile: (username: string, bio: string) => Promise<void>
  updateProfile: (profileId: string, username: string, bio: string) => Promise<void>
  createPost: (profileId: string, content: string) => Promise<void>
  likePost: (postId: string) => Promise<void>
  unlikePost: (postId: string) => Promise<void>
  createComment: (postId: string, content: string) => Promise<void>
  followUser: (profileId: string, userAddress: string) => Promise<void>
  sharePost: (postId: string, recipient: string) => Promise<void>
  getPostComments: (postId: string) => Promise<Comment[]>
}

export const useContract = () => {
  const currentAccount = useCurrentAccount()
  const address = currentAccount?.address
  const iotaClient = useIotaClient()
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction()
  const [isLoading, setIsLoading] = useState(false)
  const [hash, setHash] = useState<string | undefined>()
  const [transactionError, setTransactionError] = useState<Error | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [allPosts, setAllPosts] = useState<Post[]>([])

  // Fetch user profile
  const fetchProfile = async () => {
    if (!address) {
       setUserProfile(null)
       return
    }

    try {
      const objects = await iotaClient.getOwnedObjects({
        owner: address,
        filter: {
          StructType: `${PACKAGE_ID}::${CONTRACT_MODULE}::UserProfile`,
        },
        options: {
          showContent: true,
        },
      })

      if (objects.data.length > 0 && objects.data[0].data) {
        const profile = extractUserProfile(objects.data[0].data)
        setUserProfile(profile)
      } else {
        // Important: If no profile found for this address, reset state to null
        setUserProfile(null)
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      setUserProfile(null)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [address, iotaClient])

  // Fetch all posts (Global Feed)
  const fetchAllPosts = async () => {
    try {
      // 1. Get all PostCreated events to find all Post IDs
      // Note: In a production app, you would page through these.
      const events = await iotaClient.queryEvents({
        query: {
          MoveModule: {
            package: PACKAGE_ID,
            module: CONTRACT_MODULE,
          }
        },
        limit: 50,
        order: "descending"
      });

      // 2. Extract unique Post IDs
      const postIds = Array.from(new Set(
        events.data.map(event => {
           const parsedJson = event.parsedJson as any;
           return parsedJson?.id || null;
        }).filter(id => id !== null)
      ));

      if (postIds.length === 0) {
        setAllPosts([]);
        return;
      }

      // 3. Fetch object details for these IDs
      const objects = await iotaClient.multiGetObjects({
        ids: postIds,
        options: {
          showContent: true,
        }
      });

      // 4. Map to Post interface
      const posts = objects
        .map(obj => obj.data ? extractPost(obj.data) : null)
        .filter((p): p is Post => p !== null)
        // Sort again by created_at just to be sure (events are desc, but parallel fetch might return any order)
        .sort((a, b) => b.created_at - a.created_at);

      setAllPosts(posts);

    } catch (error) {
      console.error("Error fetching posts:", error)
      // Fallback: If event query fails (e.g. strict typing), keep old behavior or empty
    }
  }

  useEffect(() => {
    if (address) {
      fetchAllPosts()
    }
  }, [address])

  const handleTransactionSuccess = async (digest: string) => {
    try {
      setHash(digest)
      await iotaClient.waitForTransaction({ digest })
      
      // Add a small delay for indexer consistency
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Refetch data
      await Promise.all([
        fetchProfile(),
        fetchAllPosts()
      ])
    } catch (error) {
       console.error("Error waiting for transaction:", error)
    } finally {
       setIsLoading(false)
    }
  }

  const createProfile = useCallback(async (username: string, bio: string) => {
    try {
      setIsLoading(true)
      setTransactionError(null)
      const tx = new Transaction()
      
      tx.moveCall({
        arguments: [
          tx.pure.string(username),
          tx.pure.string(bio),
          tx.object("0x6"), // Clock object
        ],
        target: `${PACKAGE_ID}::${CONTRACT_MODULE}::${CONTRACT_METHODS.CREATE_PROFILE}`,
      })

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: ({ digest }) => handleTransactionSuccess(digest),
          onError: (err) => {
            setTransactionError(err instanceof Error ? err : new Error(String(err)))
            setIsLoading(false)
          },
        }
      )
    } catch (err) {
      setTransactionError(err instanceof Error ? err : new Error(String(err)))
      setIsLoading(false)
    }
  }, [signAndExecute])

  const updateProfile = useCallback(async (profileId: string, username: string, bio: string) => {
    try {
      setIsLoading(true)
      setTransactionError(null)
      const tx = new Transaction()
      
      tx.moveCall({
        arguments: [
          tx.object(profileId),
          tx.pure.string(username),
          tx.pure.string(bio),
        ],
        target: `${PACKAGE_ID}::${CONTRACT_MODULE}::${CONTRACT_METHODS.UPDATE_PROFILE}`,
      })

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: ({ digest }) => handleTransactionSuccess(digest),
          onError: (err) => {
            setTransactionError(err instanceof Error ? err : new Error(String(err)))
            setIsLoading(false)
          },
        }
      )
    } catch (err) {
      setTransactionError(err instanceof Error ? err : new Error(String(err)))
      setIsLoading(false)
    }
  }, [signAndExecute])

  const createPost = useCallback(async (profileId: string, content: string) => {
    try {
      setIsLoading(true)
      setTransactionError(null)
      const tx = new Transaction()
      
      tx.moveCall({
        arguments: [
          tx.object(profileId),
          tx.pure.string(content),
          tx.object("0x6"), // Clock object
        ],
        target: `${PACKAGE_ID}::${CONTRACT_MODULE}::${CONTRACT_METHODS.CREATE_POST}`,
      })

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: ({ digest }) => handleTransactionSuccess(digest),
          onError: (err) => {
            setTransactionError(err instanceof Error ? err : new Error(String(err)))
            setIsLoading(false)
          },
        }
      )
    } catch (err) {
      setTransactionError(err instanceof Error ? err : new Error(String(err)))
      setIsLoading(false)
    }
  }, [signAndExecute])

  const likePost = useCallback(async (postId: string) => {
    try {
      setIsLoading(true)
      setTransactionError(null)
      const tx = new Transaction()
      
      tx.moveCall({
        arguments: [tx.object(postId)],
        target: `${PACKAGE_ID}::${CONTRACT_MODULE}::${CONTRACT_METHODS.LIKE_POST}`,
      })

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: ({ digest }) => handleTransactionSuccess(digest),
          onError: (err) => {
            setTransactionError(err instanceof Error ? err : new Error(String(err)))
            setIsLoading(false)
          },
        }
      )
    } catch (err) {
      setTransactionError(err instanceof Error ? err : new Error(String(err)))
      setIsLoading(false)
    }
  }, [signAndExecute])

  const unlikePost = useCallback(async (postId: string) => {
    try {
      setIsLoading(true)
      setTransactionError(null)
      const tx = new Transaction()
      
      tx.moveCall({
        arguments: [tx.object(postId)],
        target: `${PACKAGE_ID}::${CONTRACT_MODULE}::${CONTRACT_METHODS.UNLIKE_POST}`,
      })

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: ({ digest }) => handleTransactionSuccess(digest),
          onError: (err) => {
            setTransactionError(err instanceof Error ? err : new Error(String(err)))
            setIsLoading(false)
          },
        }
      )
    } catch (err) {
      setTransactionError(err instanceof Error ? err : new Error(String(err)))
      setIsLoading(false)
    }
  }, [signAndExecute])

  const createComment = useCallback(async (postId: string, content: string) => {
    try {
      setIsLoading(true)
      setTransactionError(null)
      const tx = new Transaction()
      
      tx.moveCall({
        arguments: [
          tx.object(postId),
          tx.pure.string(content),
          tx.object("0x6"), // Clock object
        ],
        target: `${PACKAGE_ID}::${CONTRACT_MODULE}::${CONTRACT_METHODS.CREATE_COMMENT}`,
      })

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: ({ digest }) => handleTransactionSuccess(digest),
          onError: (err) => {
            setTransactionError(err instanceof Error ? err : new Error(String(err)))
            setIsLoading(false)
          },
        }
      )
    } catch (err) {
      setTransactionError(err instanceof Error ? err : new Error(String(err)))
      setIsLoading(false)
    }
  }, [signAndExecute])

  const followUser = useCallback(async (profileId: string, userAddress: string) => {
    try {
      setIsLoading(true)
      setTransactionError(null)
      const tx = new Transaction()
      
      tx.moveCall({
        arguments: [
          tx.object(profileId),
          tx.pure.address(userAddress),
          tx.object("0x6"), // Clock object
        ],
        target: `${PACKAGE_ID}::${CONTRACT_MODULE}::${CONTRACT_METHODS.FOLLOW_USER}`,
      })

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: ({ digest }) => handleTransactionSuccess(digest),
          onError: (err) => {
            setTransactionError(err instanceof Error ? err : new Error(String(err)))
            setIsLoading(false)
          },
        }
      )
    } catch (err) {
      setTransactionError(err instanceof Error ? err : new Error(String(err)))
      setIsLoading(false)
    }
  }, [signAndExecute])

  const sharePost = useCallback(async (postId: string, recipient: string) => {
    try {
      setIsLoading(true)
      setTransactionError(null)
      const tx = new Transaction()
      
      tx.moveCall({
        arguments: [
          tx.object(postId),
          tx.pure.address(recipient),
        ],
        target: `${PACKAGE_ID}::${CONTRACT_MODULE}::${CONTRACT_METHODS.SHARE_POST}`,
      })

      signAndExecute(
        { transaction: tx },
        {
          onSuccess: ({ digest }) => handleTransactionSuccess(digest),
          onError: (err) => {
            setTransactionError(err instanceof Error ? err : new Error(String(err)))
            setIsLoading(false)
          },
        }
      )
    } catch (err) {
      setTransactionError(err instanceof Error ? err : new Error(String(err)))
      setIsLoading(false)
    }
  }, [signAndExecute])

  const getPostComments = useCallback(async (postId: string): Promise<Comment[]> => {
    try {
      // NOTE: This currently only fetches comments OWNED by the current user due to getOwnedObjects.
      // In a real app, you'd likely use an Indexer or Shared Objects to see all comments.
      const objects = await iotaClient.getOwnedObjects({
        owner: address!,
        filter: {
          StructType: `${PACKAGE_ID}::${CONTRACT_MODULE}::Comment`,
        },
        options: {
          showContent: true,
        },
      })

      const comments = objects.data
        .map(obj => {
           if (obj.data?.content?.dataType !== "moveObject") return null;
           const fields = obj.data.content.fields as any;
           return {
             id: obj.data.objectId,
             post_id: fields.post_id,
             author: fields.author,
             content: fields.content,
             created_at: Number(fields.created_at)
           } as Comment;
        })
        .filter((c): c is Comment => c !== null && c.post_id === postId)
        .sort((a, b) => a.created_at - b.created_at) // Oldest first

      return comments;
    } catch (error) {
      console.error("Error fetching comments:", error)
      return []
    }
  }, [iotaClient, address])

  const getProfileByOwner = useCallback(async (ownerAddress: string): Promise<UserProfile | null> => {
    try {
      const objects = await iotaClient.getOwnedObjects({
        owner: ownerAddress,
        filter: {
          StructType: `${PACKAGE_ID}::${CONTRACT_MODULE}::UserProfile`,
        },
        options: {
          showContent: true,
        },
      });

      if (objects.data.length > 0 && objects.data[0].data) {
        return extractUserProfile(objects.data[0].data);
      }
      return null;
    } catch (e) {
      console.error("Error fetching profile for:", ownerAddress, e);
      return null;
    }
  }, [iotaClient])

  const checkIsFollowing = useCallback(async (targetAddress: string): Promise<boolean> => {
    try {
      if (!address) return false;
      const objects = await iotaClient.getOwnedObjects({
        owner: address,
        filter: {
          StructType: `${PACKAGE_ID}::${CONTRACT_MODULE}::Follow`,
        },
        options: {
          showContent: true,
        },
      });

      // Check if any follow object points to targetAddress
      return objects.data.some(obj => {
         if (obj.data?.content?.dataType !== "moveObject") return false;
         const fields = obj.data.content.fields as any;
         return fields.following === targetAddress;
      });
    } catch (e) {
      console.error("Error checking follow status:", e);
      return false;
    }
  }, [iotaClient, address]);

  // Event Polling for New Posts
  const [newPostsCount, setNewPostsCount] = useState(0)

  useEffect(() => {
    if (!address) return

    // Poll for new events every 5 seconds
    const interval = setInterval(async () => {
      try {
        // Query events
        const events = await iotaClient.queryEvents({
          query: {
             MoveModule: { 
               package: PACKAGE_ID, 
               module: CONTRACT_MODULE 
             }
          },
          limit: 5,
          order: "descending"
        })

        if (events.data.length > 0) {
           // Basic check: if the latest event is newer than the latest post we have
           const latestEvent = events.data[0];
           const eventTimestamp = Number(latestEvent.timestampMs || 0);
           
           if (allPosts.length > 0) {
              const latestPostTime = allPosts[0].created_at;
              if (eventTimestamp > latestPostTime) {
                 // Count how many are newer
                 const newCount = events.data.filter(e => Number(e.timestampMs) > latestPostTime).length;
                 if (newCount > 0) {
                   setNewPostsCount(newCount);
                 }
              }
           }
        }
      } catch (e) {
        console.error("Error polling events:", e)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [iotaClient, address, allPosts])

  const actions: ContractActions & { 
    getPostComments: (postId: string) => Promise<Comment[]>, 
    getProfileByOwner: (owner: string) => Promise<UserProfile | null>,
    checkIsFollowing: (target: string) => Promise<boolean>
  } = useMemo(() => ({
    createProfile,
    updateProfile,
    createPost,
    likePost,
    unlikePost,
    createComment,
    followUser,
    sharePost,
    getPostComments,
    getProfileByOwner,
    checkIsFollowing,
  }), [
    createProfile,
    updateProfile,
    createPost,
    likePost,
    unlikePost,
    createComment,
    followUser,
    sharePost,
    getPostComments,
    getProfileByOwner,
    checkIsFollowing
  ])

  const contractState: ContractState = {
    isLoading: isLoading || isPending,
    isPending,
    hash,
    error: transactionError,
  }

  return {
    actions,
    state: contractState,
    userProfile,
    allPosts,
    refetchPosts: async () => {
        await fetchAllPosts();
        setNewPostsCount(0); // Reset count on refetch
    },
    newPostsCount,
  }
}