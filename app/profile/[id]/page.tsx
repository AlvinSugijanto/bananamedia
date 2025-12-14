"use client";

import { useEffect, useState, use } from "react";
import { useContract, UserProfile, Post } from "@/hooks/useContract";
import Header from "@/components/Header";
import PostCard from "@/components/PostCard";
import { useCurrentAccount, useDisconnectWallet } from "@iota/dapp-kit";
import ClipLoader from "react-spinners/ClipLoader";

export default function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const {
    actions,
    userProfile: myProfile,
    allPosts,
    refetchPosts,
  } = useContract();
  const currentAccount = useCurrentAccount();
  const { mutate: disconnectWallet } = useDisconnectWallet();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Interaction states for PostCard
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null
  );
  const [commentsByPostId, setCommentsByPostId] = useState<
    Record<string, any[]>
  >({});
  const [commentContent, setCommentContent] = useState("");
  const [authorProfiles, setAuthorProfiles] = useState<
    Record<string, UserProfile>
  >({});

  // Fetch Profile Data
  useEffect(() => {
    const fetchData = async () => {
      setProfileLoading(true);
      try {
        const fetchedProfile = await actions.getProfileByOwner(id);
        setProfile(fetchedProfile);

        // Check follow status if logged in and not own profile
        if (
          currentAccount?.address &&
          fetchedProfile &&
          currentAccount.address !== fetchedProfile.owner
        ) {
          const following = await actions.checkIsFollowing(
            fetchedProfile.owner
          );
          setIsFollowing(following);
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
      } finally {
        setProfileLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, actions, currentAccount]);

  // Filter Posts
  useEffect(() => {
    if (allPosts.length > 0) {
      const filtered = allPosts.filter((p) => p.author === id);
      setUserPosts(filtered);
    }
  }, [allPosts, id]);

  const handleLikePost = async (postId: string) => {
    await actions.likePost(postId);
  };

  const handleToggleComments = async (postId: string) => {
    if (activeCommentPostId === postId) {
      setActiveCommentPostId(null);
    } else {
      setActiveCommentPostId(postId);
      // Fetch comments
      const comments = await actions.getPostComments(postId);
      setCommentsByPostId((prev) => ({
        ...prev,
        [postId]: comments,
      }));

      // Fetch profiles for comment authors
      const commentAuthors = new Set(comments.map((c: any) => c.author));
      const missingAuthors = Array.from(commentAuthors).filter(
        (a) => !authorProfiles[a as string]
      );

      if (missingAuthors.length > 0) {
        const newProfiles: Record<string, UserProfile> = {};
        await Promise.all(
          missingAuthors.map(async (author) => {
            const profile = await actions.getProfileByOwner(author as string);
            if (profile) newProfiles[author as string] = profile;
          })
        );

        setAuthorProfiles((prev) => ({ ...prev, ...newProfiles }));
      }
    }
  };

  const handleCommentOnPost = async (postId: string) => {
    if (commentContent.trim()) {
      await actions.createComment(postId, commentContent);
      setCommentContent("");
      const comments = await actions.getPostComments(postId);
      setCommentsByPostId((prev) => ({
        ...prev,
        [postId]: comments,
      }));
    }
  };

  const handleFollow = async () => {
    if (myProfile && profile) {
      await actions.followUser(myProfile.id, profile.owner);
      setIsFollowing(true);
      // Refresh profile data to update counts
      const updatedProfile = await actions.getProfileByOwner(id);
      if (updatedProfile) setProfile(updatedProfile);
    }
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <ClipLoader color="#FBBF24" size={50} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header
          userProfile={myProfile}
          disconnectWallet={disconnectWallet}
          onCreatePostClick={() => {}} // No create post from here for now
        />
        <div className="flex flex-col items-center justify-center h-[80vh] text-center p-4">
          <div className="text-6xl mb-4">🍌?</div>
          <h1 className="text-2xl font-bold text-gray-800">User Not Found</h1>
          <p className="text-gray-500">
            This user hasn't joined the bunch yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        userProfile={myProfile}
        disconnectWallet={disconnectWallet}
        onCreatePostClick={() => {}}
      />

      <main className="max-w-[935px] mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-16 mb-12 pb-12">
          {/* Avatar */}
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-yellow-400 flex items-center justify-center text-white text-6xl font-bold shadow-inner ring-4 ring-yellow-100 flex-shrink-0">
            {profile.username.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
              <h1 className="text-2xl md:text-3xl font-light text-gray-800">
                {profile.username}
              </h1>
              {myProfile?.owner === profile.owner ? (
                <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-1.5 px-4 rounded-lg text-sm transition-colors">
                  Edit Profile
                </button>
              ) : (
                <button
                  onClick={handleFollow}
                  disabled={isFollowing}
                  className={`font-semibold py-1.5 px-6 rounded-lg text-sm shadow-sm transition-colors ${
                    isFollowing
                      ? "bg-gray-200 text-gray-800 cursor-default"
                      : "bg-yellow-400 hover:bg-yellow-500 text-white"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              )}
            </div>

            <div className="flex gap-8 mb-4">
              <div className="flex gap-1 text-gray-800">
                <span className="font-bold text-gray-800">
                  {profile.post_count}
                </span>{" "}
                posts
              </div>
              <div className="flex gap-1 text-gray-800">
                <span className="font-bold text-gray-800">
                  {profile.follower_count}
                </span>{" "}
                followers
              </div>
              <div className="flex gap-1 text-gray-800">
                <span className="font-bold text-gray-800">
                  {profile.following_count}
                </span>{" "}
                following
              </div>
            </div>

            <div className="font-bold text-gray-800 mb-1">
              {profile.username}
            </div>
            <p className="text-gray-700 whitespace-pre-wrap max-w-md">
              {profile.bio}
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center justify-center gap-8 border-t border-gray-300 -mt-[1px] mb-8">
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-2 py-4 border-t-2 transition-all ${
              viewMode === "grid"
                ? "border-gray-800 text-gray-800"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <svg
              aria-label="Grid"
              className={
                viewMode === "grid"
                  ? "fill-current"
                  : "fill-none stroke-current stroke-2"
              }
              color="rgb(0, 0, 0)"
              height="12"
              role="img"
              viewBox="0 0 24 24"
              width="12"
              style={{ width: 12, height: 12 }}
            >
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="2"
                ry="2"
                stroke="currentColor"
                strokeWidth={viewMode === "grid" ? "0" : "2"}
                fill={viewMode === "grid" ? "currentColor" : "none"}
              />
              <path
                d="M3 3h6v6H3V3zm0 6h6v6H3V9zm0 6h6v6H3v-6zm6-12h6v6H9V3zm0 6h6v6H9V9zm0 6h6v6H9v-6zm6-12h6v6h-6V3zm0 6h6v6h-6V9zm0 6h6v6h-6v-6z"
                fill={viewMode === "grid" ? "white" : "none"}
              />
            </svg>
            <span className="text-xs font-bold uppercase tracking-widest">
              Posts
            </span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-2 py-4 border-t-2 transition-all ${
              viewMode === "list"
                ? "border-gray-800 text-gray-800"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            <span className="text-xs font-bold uppercase tracking-widest">
              Feed
            </span>
          </button>
        </div>

        {/* Content */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-3 gap-1 md:gap-8">
            {userPosts.length === 0 ? (
              <div className="col-span-3 py-20 text-center text-gray-500">
                <div className="text-4xl mb-4">📷</div>
                <h3 className="font-bold text-xl mb-2">No Posts Yet</h3>
              </div>
            ) : (
              userPosts.map((post) => (
                <GridPostItem key={post.id} post={post} />
              ))
            )}
          </div>
        ) : (
          // List View
          <div className="flex flex-col gap-6 w-full max-w-[600px] mx-auto">
            {userPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                userProfile={profile}
                currentAccountAddress={currentAccount?.address}
                onLike={handleLikePost}
                onComment={handleCommentOnPost}
                activeCommentPostId={activeCommentPostId}
                onToggleComments={handleToggleComments}
                commentContent={commentContent}
                onCommentContentChange={setCommentContent}
                comments={commentsByPostId[post.id] || []}
                authorProfiles={authorProfiles}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add Billabong font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Billabong&display=swap');
      `}</style>
    </div>
  );
}

const GridPostItem = ({ post }: { post: Post }) => {
  const [imageLoading, setImageLoading] = useState(true);
  let postImage = null;

  try {
    if (post.content.trim().startsWith("{")) {
      const parsed = JSON.parse(post.content);
      if (parsed.image) postImage = parsed.image;
    }
  } catch (e) {}

  return (
    <div className="aspect-square relative group bg-gray-100 cursor-pointer overflow-hidden">
      {postImage ? (
        <>
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <ClipLoader color="#FBBF24" size={20} />
            </div>
          )}
          <img
            src={postImage}
            alt="Post"
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoading ? "opacity-0" : "opacity-100"
            }`}
            onLoad={() => setImageLoading(false)}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              setImageLoading(false);
            }}
          />
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 text-gray-400">
          <span className="text-xs text-center line-clamp-4 font-medium opacity-50">
            {post.content.length > 50
              ? post.content.substring(0, 50) + "..."
              : post.content}
          </span>
        </div>
      )}

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-bold z-20">
        <div className="flex items-center gap-1">
          <span>❤️</span> {post.like_count}
        </div>
        <div className="flex items-center gap-1">
          <span>💬</span> {post.comment_count}
        </div>
      </div>
    </div>
  );
};
