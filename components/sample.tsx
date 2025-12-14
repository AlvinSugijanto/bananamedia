"use client";

/**
 * ============================================================================
 * SOCIAL MEDIA DAPP - INSTAGRAM STYLE UI
 * ============================================================================
 *
 * A decentralized social media platform built on IOTA
 * Instagram-inspired design and user experience
 *
 * ============================================================================
 */

import {
  ConnectModal,
  useCurrentAccount,
  useDisconnectWallet,
} from "@iota/dapp-kit";
import { useContract, UserProfile } from "@/hooks/useContract";
import Header from "./Header";
import Modal from "./Modal";
import PostCard from "./PostCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ClipLoader from "react-spinners/ClipLoader";
import { useState, useEffect, useRef } from "react";

const SocialMediaApp = () => {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const { actions, state, userProfile, allPosts, refetchPosts, newPostsCount } =
    useContract();

  const [modalOpen, setModalOpen] = useState(false);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);

  // Form states
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [postContent, setPostContent] = useState("");
  const [commentContent, setCommentContent] = useState("");
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null
  );
  const [commentsByPostId, setCommentsByPostId] = useState<
    Record<string, any[]>
  >({});

  // Image Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            // Skip if it is us (we have myProfile?) - actually local userProfile ref might not represent us if we haven't connected?
            // but authorProfiles uses address as key.
            // actions.getProfileByOwner is efficient enough.
            const profile = await actions.getProfileByOwner(author as string);
            if (profile) newProfiles[author as string] = profile;
          })
        );

        setAuthorProfiles((prev) => ({ ...prev, ...newProfiles }));
      }
    }
  };

  // Author Profile Fetching
  const [authorProfiles, setAuthorProfiles] = useState<
    Record<string, UserProfile>
  >({});

  useEffect(() => {
    const fetchAuthorProfiles = async () => {
      const uniqueAuthors = Array.from(new Set(allPosts.map((p) => p.author)));
      // Filter authors we don't have yet
      const missingAuthors = uniqueAuthors.filter((a) => !authorProfiles[a]);

      if (missingAuthors.length > 0) {
        const newProfiles: Record<string, UserProfile> = {};

        await Promise.all(
          missingAuthors.map(async (author) => {
            // If author is current user, we already have it (maybe)
            if (userProfile && userProfile.owner === author) {
              newProfiles[author] = userProfile;
            } else {
              const profile = await actions.getProfileByOwner(author);
              if (profile) {
                newProfiles[author] = profile;
              }
            }
          })
        );

        setAuthorProfiles((prev) => ({
          ...prev,
          ...newProfiles,
        }));
      }
    };

    if (allPosts.length > 0) {
      fetchAuthorProfiles();
    }
  }, [allPosts, actions, userProfile]);

  const isConnected = !!currentAccount;

  useEffect(() => {
    if (userProfile) {
      setUsername(userProfile.username);
      setBio(userProfile.bio);
    }
  }, [userProfile]);

  const handleCreateProfile = async () => {
    if (username.trim() && bio.trim()) {
      await actions.createProfile(username, bio);
      setShowCreateProfile(false);
      setUsername("");
      setBio("");
    }
  };

  const handleUpdateProfile = async () => {
    if (userProfile && username.trim() && bio.trim()) {
      await actions.updateProfile(userProfile.id, username, bio);
      setShowEditProfile(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleCreatePost = async () => {
    if (userProfile && (postContent.trim() || selectedFile)) {
      let finalContent = postContent;

      if (selectedFile) {
        try {
          setIsUploading(true);

          const apiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
          const secretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_API_KEY;

          if (!apiKey || !secretKey) {
            alert("Pinata API keys not configured in .env");
            throw new Error("Pinata API keys missing");
          }

          const formData = new FormData();
          formData.append("file", selectedFile);

          // Add Pinata metadata
          const metadata = JSON.stringify({
            name: selectedFile.name,
            keyvalues: {
              timestamp: Date.now().toString(),
            },
          });
          formData.append("pinataMetadata", metadata);

          const res = await fetch(
            "https://api.pinata.cloud/pinning/pinFileToIPFS",
            {
              method: "POST",
              headers: {
                pinata_api_key: apiKey,
                pinata_secret_api_key: secretKey,
              },
              body: formData,
            }
          );

          if (!res.ok) {
            throw new Error(`Upload failed: ${res.statusText}`);
          }

          const data = await res.json();
          if (data.IpfsHash) {
            const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
            // Store as JSON string to handle both text and image
            const contentObj = {
              text: postContent,
              image: ipfsUrl,
            };
            finalContent = JSON.stringify(contentObj);
          }
        } catch (e) {
          console.error("Upload failed", e);
          setIsUploading(false);
          return;
        }
      } else {
        // Even if only text, consistency helps. But for backward compat, maybe just text is fine.
        // Let's use JSON for new structure if we want to be consistent, but pure string is safer for now.
        // Actually, if we want to support future images without migration, let's keep simple text as text
        // AND check if string starts with { "text": ... } in PostCard.
        // Or just straightforward:
        if (postContent.trim()) {
          // Basic text post
          finalContent = postContent;
        }
      }

      await actions.createPost(userProfile.id, finalContent);
      setPostContent("");
      setSelectedFile(null);
      setImagePreview(null);
      setShowCreatePost(false);
      setIsUploading(false);
    }
  };

  console.log(allPosts);

  const handleLikePost = async (postId: string) => {
    await actions.likePost(postId);
  };

  const handleCommentOnPost = async (postId: string) => {
    if (commentContent.trim()) {
      await actions.createComment(postId, commentContent);
      setCommentContent("");
      // Refetch comments for this post
      const comments = await actions.getPostComments(postId);
      setCommentsByPostId((prev) => ({
        ...prev,
        [postId]: comments,
      }));
    }
  };

  const formatDate = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Hero Landing Page (Disconnected)
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 to-orange-500 flex flex-col relative overflow-hidden items-center justify-center">
        {/* Animated background elements */}
        <div className="absolute top-[10%] left-[5%] w-[100px] h-[100px] rounded-full bg-white/20 animate-float" />
        <div className="absolute top-[60%] right-[10%] w-[150px] h-[150px] rounded-full bg-white/15 animate-float-delayed" />

        {/* Floating Bananas */}
        <div className="absolute top-[20%] left-[15%] animate-float-delayed opacity-40 -rotate-12 pointer-events-none">
          <svg width="120" height="120" viewBox="0 0 100 100" fill="none">
            <path
              d="M70 10C70 10 90 20 85 50C80 80 50 90 20 85"
              stroke="white"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M20 85C20 85 40 80 60 40"
              stroke="white"
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.5"
            />
          </svg>
        </div>
        <div className="absolute bottom-[20%] right-[15%] animate-float opacity-30 rotate-45 pointer-events-none">
          <svg width="180" height="180" viewBox="0 0 100 100" fill="none">
            <path
              d="M70 10C70 10 90 20 85 50C80 80 50 90 20 85"
              stroke="white"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="max-w-2xl w-full p-8 z-10 flex flex-col items-center">
          <div className="bg-white/10 backdrop-blur-md border border-white/30 rounded-2xl p-12 text-center shadow-2xl w-full relative overflow-hidden">
            {/* Decorative corner bananas */}
            <div className="absolute -top-6 -left-6 opacity-20 rotate-[-45deg]">
              <span className="text-9xl">🍌</span>
            </div>
            <div className="absolute -bottom-6 -right-6 opacity-20 rotate-[135deg]">
              <span className="text-9xl">🍌</span>
            </div>

            <h1 className="text-7xl font-billabong mb-6 text-white font-normal tracking-wide drop-shadow-md">
              BananaMedia
            </h1>

            <p className="text-2xl text-white/95 mb-10 leading-relaxed max-w-lg mx-auto">
              The freshest social media functionality on the blockchain. Slice
              in, share, and connect!
            </p>

            <div className="flex gap-6 justify-center flex-wrap mb-10">
              {[
                "🍌 Fresh Content",
                "💎 Own Your Data",
                "⚡ Fast & Secure",
                "🐒 Go Bananas",
              ].map((feature, i) => (
                <div
                  key={i}
                  className="bg-white/20 backdrop-blur-md py-3 px-6 rounded-full text-white font-semibold text-base shadow-sm"
                >
                  {feature}
                </div>
              ))}
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="bg-white text-amber-500 py-5 px-16 rounded-full border-none text-xl font-bold cursor-pointer shadow-lg hover:-translate-y-1 hover:shadow-2xl active:scale-95 transition-all duration-200"
            >
              Connect Wallet
            </button>

            <div className="mt-8 text-sm text-white/80 shadow-sm font-medium">
              Powered by IOTA • Built with Move
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/30 rounded-xl p-4 mt-6 text-center text-sm text-white/90 px-8">
            <span className="font-semibold">Own your data. </span>
            <span>Connect with blockchain.</span>
          </div>
        </div>
        <ConnectModal
          trigger={<button className="hidden" />}
          open={modalOpen}
          onOpenChange={(isOpen) => setModalOpen(isOpen)}
        />
      </div>
    );
  }

  // Main App (Connected) - Instagram Style
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Instagram-style Header */}
      <Header
        userProfile={userProfile}
        disconnectWallet={disconnectWallet}
        onCreatePostClick={() => setShowCreatePost(true)}
      />

      {/* Main Content - Banana Layout */}
      <main className="max-w-[1000px] mx-auto my-8 px-4 grid grid-cols-[1fr_320px] gap-10 items-start">
        {/* Left Column - Feed */}
        <div className="flex flex-col gap-8 w-full">
          {!userProfile ? (
            // Create Profile Card (Banana Theme)
            <div className="bg-white/90 backdrop-blur-sm border-2 border-yellow-200 rounded-3xl p-12 px-8 text-center shadow-lg relative overflow-hidden">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-yellow-100 flex items-center justify-center relative z-10 animate-bounce-slow">
                <span className="text-5xl">👤</span>
              </div>

              <h2 className="text-3xl font-billabong text-amber-600 mb-2 tracking-wide">
                Join the Bunch!
              </h2>
              <p className="text-gray-500 mb-8 font-medium">
                Create your profile to start peeling into the conversation.
              </p>

              {!showCreateProfile ? (
                <button
                  onClick={() => setShowCreateProfile(true)}
                  className="bg-yellow-400 text-white py-3 px-10 rounded-full border-b-4 border-yellow-500 text-lg font-bold cursor-pointer hover:bg-yellow-500 hover:-translate-y-0.5 active:translate-y-0 active:border-b-0 transition-all"
                >
                  Create Profile
                </button>
              ) : (
                <div className="max-w-[350px] mx-auto text-left relative z-10">
                  <div className="mb-4">
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full border-2 border-yellow-200 rounded-xl bg-yellow-50/50 text-gray-800 focus-visible:ring-amber-400 focus-visible:ring-offset-0 focus-visible:border-amber-400 h-11"
                    />
                  </div>
                  <div className="mb-5">
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Bio (What's your flavor?)..."
                      className="w-full border-2 border-yellow-200 rounded-xl bg-yellow-50/50 text-gray-800 min-h-[100px] resize-y font-inherit focus-visible:ring-amber-400 focus-visible:ring-offset-0 focus-visible:border-amber-400"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleCreateProfile}
                      disabled={
                        state.isLoading || !username.trim() || !bio.trim()
                      }
                      className={`flex-1 bg-yellow-400 text-white p-6 rounded-xl font-bold text-sm shadow-md hover:bg-yellow-500 hover:-translate-y-0.5 transition-all text-base ${
                        state.isLoading || !username.trim() || !bio.trim()
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                    >
                      {state.isLoading ? (
                        <ClipLoader size={16} color="white" />
                      ) : (
                        "Go Bananas! 🍌"
                      )}
                    </Button>
                    <Button
                      onClick={() => setShowCreateProfile(false)}
                      variant="outline"
                      className="py-6 px-6 rounded-xl border-2 border-gray-200 bg-white font-bold text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors text-base"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Modal Component is rendered here but controlled via state */}
              <Modal
                isOpen={showCreatePost}
                onClose={() => {
                  setShowCreatePost(false);
                  setPostContent("");
                  setSelectedFile(null);
                  setImagePreview(null);
                }}
                title="Create new post"
                rightAction={{
                  label: "Share",
                  onClick: handleCreatePost,
                  disabled:
                    (!postContent.trim() && !selectedFile) || isUploading,
                  loading: state.isLoading || isUploading,
                }}
              >
                <Textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="What's up today?..."
                  autoFocus
                  className="w-full min-h-[100px] border-none outline-none text-base resize-none font-inherit bg-transparent p-0 text-gray-800 placeholder-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none -mt-6"
                />

                {imagePreview && (
                  <div className="relative mb-4 group">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-xl border border-gray-200"
                    />
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setImagePreview(null);
                      }}
                      className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2 border-t pt-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-amber-500 hover:bg-amber-50 rounded-full transition-colors"
                    title="Add Image"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                    </svg>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </Modal>

              {/* Posts Feed */}
              {allPosts.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm border-dashed border-4 border-yellow-200 rounded-3xl p-16 px-8 text-center flex flex-col items-center justify-center h-[400px]">
                  <div className="w-20 h-20 mb-6 flex items-center justify-center animate-pulse">
                    <span className="text-7xl">🍌</span>
                  </div>
                  <h2 className="text-4xl font-billabong text-gray-800 mb-3 tracking-wide">
                    It's quiet in here...
                  </h2>
                  <p className="text-gray-500 font-medium text-lg max-w-md">
                    Be the top banana! Share your first post and get the bunch
                    talking.
                  </p>
                  <button
                    onClick={() => setShowCreatePost(true)}
                    className="mt-8 text-amber-500 font-bold hover:underline"
                  >
                    Start Posting →
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-8 pb-20 relative">
                  {/* New Posts Badge */}
                  {/* {newPostsCount > 0 && (
                    <div className="sticky top-24 z-30 flex justify-center animate-bounce-short">
                      <button 
                        onClick={() => refetchPosts()}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow-lg flex items-center gap-2 transform transition-all hover:scale-105"
                      >
                         <span>✨ {newPostsCount} New {newPostsCount === 1 ? 'Post' : 'Posts'}</span>
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-up">
                            <path d="m5 12 7-7 7 7"/>
                            <path d="M12 19V5"/>
                         </svg>
                      </button>
                    </div>
                  )} */}

                  {allPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      userProfile={
                        authorProfiles[post.author] || {
                          username: "Peeling...",
                          bio: "",
                          post_count: 0,
                          follower_count: 0,
                          following_count: 0,
                          created_at: 0,
                          owner: post.author,
                          id: "loading",
                        }
                      }
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
            </>
          )}
        </div>

        {/* Right Column - Profile Sidebar */}
        {userProfile && (
          <div className="sticky top-[5.5rem] h-fit p-1">
            <div className="bg-white/90 backdrop-blur-sm border-2 border-yellow-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-yellow-400 text-white flex items-center justify-center font-bold text-2xl shadow-inner border-4 border-white ring-2 ring-yellow-200">
                  {userProfile.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-lg text-gray-800 truncate font-billabong tracking-wide text-xl">
                    {userProfile.username}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {userProfile.bio || "No bio yet"}
                  </div>
                </div>
                <button
                  onClick={() => setShowEditProfile(!showEditProfile)}
                  className="text-amber-500 hover:text-amber-600 font-semibold text-sm transition-colors"
                >
                  Edit
                </button>
              </div>

              {showEditProfile && (
                <div className="bg-yellow-50 rounded-xl p-4 mb-6 border border-yellow-100">
                  <div className="mb-3">
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      className="bg-white border-yellow-200 focus-visible:ring-amber-400 focus-visible:ring-offset-0 focus-visible:border-amber-400"
                    />
                  </div>
                  <div className="mb-3">
                    <Textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Bio"
                      className="bg-white border-yellow-200 focus-visible:ring-amber-400 focus-visible:ring-offset-0 focus-visible:border-amber-400 min-h-[80px] resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpdateProfile}
                      disabled={state.isLoading}
                      className={`flex-1 bg-yellow-400 text-white hover:bg-yellow-500 font-bold ${
                        state.isLoading ? "opacity-50" : ""
                      }`}
                      size="sm"
                    >
                      {state.isLoading ? (
                        <ClipLoader size={12} color="white" />
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                    <Button
                      onClick={() => setShowEditProfile(false)}
                      variant="outline"
                      className="border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-600 font-semibold"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 py-4 border-t border-yellow-100">
                <div className="text-center group cursor-default">
                  <div className="font-bold text-gray-800 text-lg group-hover:text-amber-500 transition-colors">
                    {userProfile.post_count}
                  </div>
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                    posts
                  </div>
                </div>
                <div className="text-center group cursor-default">
                  <div className="font-bold text-gray-800 text-lg group-hover:text-amber-500 transition-colors">
                    {userProfile.follower_count}
                  </div>
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                    followers
                  </div>
                </div>
                <div className="text-center group cursor-default">
                  <div className="font-bold text-gray-800 text-lg group-hover:text-amber-500 transition-colors">
                    {userProfile.following_count}
                  </div>
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                    following
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-yellow-100 text-xs text-center text-gray-400">
                <p>© 2025 BananaMedia</p>
                <p className="mt-1">Fresh from the Blockchain 🍌</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Billabong font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Billabong&display=swap');
      `}</style>
    </div>
  );
};

export default SocialMediaApp;
