"use client";

import { useEffect, useState } from "react";
import { useContract, UserProfile } from "@/hooks/useContract";
import Link from "next/link";
import ClipLoader from "react-spinners/ClipLoader";
import Header from "@/components/Header";
import { useCurrentAccount, useDisconnectWallet } from "@iota/dapp-kit";

export default function LeaderboardPage() {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const { actions, allPosts, userProfile: myProfile } = useContract();

  const [leaders, setLeaders] = useState<
    (UserProfile & { totalLikes: number })[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      if (allPosts.length === 0) {
        // If we have no posts yet, we might still be loading or there are simply no posts.
      }

      setLoading(true);
      try {
        // 1. Extract unique authors from all posts
        const uniqueAuthors = Array.from(
          new Set(allPosts.map((p) => p.author))
        );

        // 2. Fetch profiles for these authors AND calculate likes
        const profiles: (UserProfile & { totalLikes: number })[] = [];
        await Promise.all(
          uniqueAuthors.map(async (author) => {
            const profile = await actions.getProfileByOwner(author);
            if (profile) {
              // Calculate total likes from all posts
              const userPosts = allPosts.filter((p) => p.author === author);
              const totalLikes = userPosts.reduce(
                (sum, post) => sum + post.like_count,
                0
              );

              profiles.push({ ...profile, totalLikes });
            }
          })
        );

        // 3. Sort by totalLikes (desc), then followers, then posts
        const sorted = profiles.sort((a, b) => {
          if (b.totalLikes !== a.totalLikes) {
            return b.totalLikes - a.totalLikes;
          }
          if (b.follower_count !== a.follower_count) {
            return b.follower_count - a.follower_count;
          }
          return b.post_count - a.post_count;
        });

        setLeaders(sorted);
      } catch (e) {
        console.error("Error fetching leaderboard:", e);
      } finally {
        setLoading(false);
      }
    };

    if (allPosts.length > 0) {
      fetchLeaders();
    } else {
      const timer = setTimeout(() => setLoading(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [allPosts, actions]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        userProfile={myProfile}
        disconnectWallet={disconnectWallet}
        onCreatePostClick={() => {}} // No create post action from here needed contextually
      />

      <main className="max-w-[800px] mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-billabong text-amber-600 mb-2">
            Top Banana's Lovers
          </h1>
          <p className="text-gray-500">
            The ripest bunch in the blockchain! 🍌🏆
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <ClipLoader color="#FBBF24" size={50} />
          </div>
        ) : leaders.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-4xl mb-4">🧊</div>
            <p>No leaders found yet. Be the first to post!</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {leaders.map((leader, index) => (
              <div
                key={leader.id}
                className={`flex items-center gap-4 p-4 border-b border-gray-100 last:border-0 hover:bg-yellow-50/50 transition-colors ${
                  index < 3
                    ? "bg-gradient-to-r from-yellow-50/30 to-transparent"
                    : ""
                }`}
              >
                {/* Rank */}
                <div
                  className={`w-10 text-center font-bold text-xl ${
                    index === 0
                      ? "text-yellow-500 scale-125"
                      : index === 1
                      ? "text-gray-400 scale-110"
                      : index === 2
                      ? "text-amber-700 scale-105"
                      : "text-gray-300"
                  }`}
                >
                  {index === 0 ? "👑" : index + 1}
                </div>

                {/* Avatar */}
                <Link href={`/profile/${leader.owner}`}>
                  <div className="w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center text-white font-bold text-lg shadow-inner ring-2 ring-yellow-200 cursor-pointer">
                    {leader.username.charAt(0).toUpperCase()}
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/profile/${leader.owner}`}
                    className="hover:underline decoration-amber-400"
                  >
                    <div className="font-bold text-gray-800 truncate text-lg">
                      {leader.username}
                    </div>
                  </Link>
                  <div className="text-xs text-gray-500 truncate">
                    {leader.bio || "No bio"}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4 md:gap-8 text-right">
                  <div className="flex flex-col items-end w-16">
                    <span className="font-bold text-amber-500">
                      {leader.totalLikes}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                      Banana
                    </span>
                  </div>
                  <div className="flex flex-col items-end w-16">
                    <span className="font-bold text-gray-800">
                      {leader.follower_count}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                      Followers
                    </span>
                  </div>
                  <div className="flex flex-col items-end w-12">
                    <span className="font-bold text-gray-800">
                      {leader.post_count}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                      Posts
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
