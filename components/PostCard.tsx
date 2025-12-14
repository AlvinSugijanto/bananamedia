"use client";

import { Post, UserProfile } from "@/hooks/useContract";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";

interface PostCardProps {
  post: Post;
  userProfile: UserProfile;
  currentAccountAddress?: string;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  activeCommentPostId: string | null;
  onToggleComments: (postId: string) => void;
  commentContent: string;
  onCommentContentChange: (content: string) => void;
  comments: any[]; // Or import Comment type
  authorProfiles: Record<string, UserProfile>;
}

const formatDate = (timestamp: number) => {
  try {
    const date = new Date(Number(timestamp));
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (e) {
    return "recently";
  }
};

const PostCard = ({
  post,
  userProfile,
  currentAccountAddress,
  onLike,
  onComment,
  activeCommentPostId,
  onToggleComments,
  commentContent,
  onCommentContentChange,
  comments,
  authorProfiles,
}: PostCardProps) => {
  const isLiked = post.likes.includes(currentAccountAddress || "");

  // Content Parsing logic
  let postText = post.content;
  let postImage = null;

  try {
    // Check if content looks like JSON
    if (
      post.content.trim().startsWith("{") &&
      post.content.trim().endsWith("}")
    ) {
      const parsed = JSON.parse(post.content);
      if (parsed.text || parsed.image) {
        postText = parsed.text || "";
        postImage = parsed.image || null;
      }
    }
  } catch (e) {
    // Not JSON, keep as plain text
  }

  // Image Loading State
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <div className="bg-white/80 backdrop-blur-sm border-2 border-yellow-200 rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
      {/* Post Header */}
      <div className="p-4 flex items-center gap-3 bg-gradient-to-r from-yellow-50 to-transparent border-b border-yellow-100">
        <Link href={`/profile/${userProfile.owner}`}>
          <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-white font-bold text-lg shadow-inner ring-2 ring-yellow-200 cursor-pointer hover:ring-yellow-400 transition-all">
            {userProfile.username.charAt(0).toUpperCase()}
          </div>
        </Link>
        <div className="flex-1">
          <Link
            href={`/profile/${userProfile.owner}`}
            className="hover:underline decoration-amber-500"
          >
            <div className="font-bold text-gray-800 text-lg font-billabong tracking-wide">
              {userProfile.username}
            </div>
          </Link>
          <div className="text-xs text-amber-500/80 font-medium">
            Banana Splitter
          </div>
        </div>
      </div>

      {/* Post Content Area - Image */}
      {postImage ? (
        <div className="w-full bg-gray-100 flex items-center justify-center relative min-h-[300px]">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <ClipLoader color="#FBBF24" size={40} />
            </div>
          )}
          <img
            src={postImage}
            alt="Post Content"
            className={`w-full max-h-[600px] object-cover transition-opacity duration-500 ${
              imageLoading ? "opacity-0" : "opacity-100"
            }`}
            onLoad={() => setImageLoading(false)}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              setImageLoading(false);
            }}
          />
        </div>
      ) : (
        /* Placeholder / Text-only mode visual */
        <div className="w-full aspect-square bg-yellow-50 flex items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(#fbbf24_1px,transparent_1px)] [background-size:16px_16px] opacity-20"></div>
          <div className="text-6xl font-bold text-yellow-500/20 group-hover:scale-110 transition-transform duration-500">
            {userProfile.username.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Post Actions */}
      <div className="p-4">
        <div className="flex gap-4 mb-3">
          {/* Banana Like Button */}
          <button
            onClick={() => onLike(post.id)}
            className="group flex items-center justify-center transition-transform active:scale-90"
            title={isLiked ? "Unlike" : "Like"}
          >
            {isLiked ? (
              <div className="relative">
                <span className="text-3xl filter drop-shadow-sm animate-bounce-short">
                  🍌
                </span>
              </div>
            ) : (
              <span className="text-3xl opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                🍌
              </span>
            )}
          </button>

          <button
            onClick={() => onToggleComments(post.id)}
            className="text-gray-400 hover:text-amber-500 transition-colors"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </button>
        </div>

        <div className="font-bold text-gray-800 mb-2">
          {post.like_count} {post.like_count === 1 ? "banana" : "bananas"}
        </div>

        <div className="text-gray-800 mb-2 leading-relaxed">
          <span className="font-bold mr-2 text-amber-600 font-billabong text-lg">
            {userProfile.username}
          </span>
          {postText}
        </div>

        {post.comment_count > 0 && (
          <button
            onClick={() => onToggleComments(post.id)}
            className="text-gray-400 text-sm font-medium hover:text-amber-500 transition-colors mb-1"
          >
            {activeCommentPostId === post.id
              ? "Hide comments"
              : `View all ${post.comment_count} comments`}
          </button>
        )}

        <div className="text-xs text-gray-400 font-medium">
          {formatDate(post.created_at)}
        </div>
      </div>

      {/* Comment Section */}
      {activeCommentPostId === post.id && (
        <div className="border-t border-gray-200 bg-gray-50/50">
          {/* Render Comments List */}
          {comments && comments.length > 0 && (
            <div className="max-h-60 overflow-y-auto p-4 flex flex-col gap-3">
              {comments.map((comment: any) => {
                const authorProfile = authorProfiles[comment.author];
                return (
                  <div key={comment.id} className="flex gap-2 text-sm">
                    {authorProfile ? (
                      <Link href={`/profile/${authorProfile.owner}`}>
                        <span className="font-bold text-gray-800 hover:underline cursor-pointer">
                          {authorProfile.username}
                        </span>
                      </Link>
                    ) : (
                      <span className="font-bold text-gray-800 truncate max-w-[100px]">
                        {comment.author.slice(0, 6)}...
                      </span>
                    )}
                    <span className="text-gray-700">{comment.content}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="p-3 px-4 flex gap-3 border-t border-gray-100 bg-white">
            <Input
              type="text"
              value={commentContent}
              onChange={(e) => onCommentContentChange(e.target.value)}
              placeholder="Add a comment... (keep it sweet)"
              className="flex-1 border-none bg-transparent outline-none text-sm placeholder:text-gray-400 focus-visible:ring-0 shadow-none h-auto py-1"
              onKeyPress={(e) => {
                if (e.key === "Enter" && commentContent.trim()) {
                  onComment(post.id);
                }
              }}
            />
            <Button
              onClick={() => onComment(post.id)}
              disabled={!commentContent.trim()}
              variant="ghost"
              className={`text-amber-500 hover:text-amber-600 hover:bg-amber-50 font-semibold text-sm ${
                !commentContent.trim() ? "opacity-30 cursor-not-allowed" : ""
              }`}
            >
              Post
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;
