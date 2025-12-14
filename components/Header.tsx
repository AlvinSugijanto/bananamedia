import Link from "next/link";
import { UserProfile, useContract } from "@/hooks/useContract";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";

interface HeaderProps {
  userProfile: UserProfile | null;
  disconnectWallet: () => void;
  onCreatePostClick: () => void;
}

const Header = ({
  userProfile,
  disconnectWallet,
  onCreatePostClick,
}: HeaderProps) => {
  const { allPosts, actions } = useContract();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [knownProfiles, setKnownProfiles] = useState<
    Record<string, UserProfile>
  >({});
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Build directory of users from posts continuously (lazy)
  useEffect(() => {
    if (allPosts.length > 0 && showResults) {
      const fetchDirectories = async () => {
        const uniqueAuthors = Array.from(
          new Set(allPosts.map((p) => p.author))
        );
        const missing = uniqueAuthors.filter((a) => !knownProfiles[a]);

        if (missing.length > 0) {
          const newProfiles: Record<string, UserProfile> = {};
          await Promise.all(
            missing.map(async (author) => {
              const p = await actions.getProfileByOwner(author);
              if (p) newProfiles[author] = p;
            })
          );
          setKnownProfiles((prev) => ({ ...prev, ...newProfiles }));
        }
      };
      fetchDirectories();
    }
  }, [allPosts, showResults, actions, knownProfiles]);

  // Handle Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = Object.values(knownProfiles).filter(
      (p) => p.username.toLowerCase().includes(query) || p.owner.includes(query)
    );
    setSearchResults(results.slice(0, 5)); // Limit to 5
  }, [searchQuery, knownProfiles]);

  return (
    <header className="bg-white border-b border-gray-300 py-3 px-4 sticky top-0 z-20">
      <div className="max-w-[975px] mx-auto flex justify-between items-center gap-4">
        <div className="flex gap-2 items-center shrink-0">
          <Image src="/logo.png" alt="Logo" width={40} height={40} />
          <Link
            href="/"
            className="text-2xl md:text-3xl font-billabong bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 bg-clip-text text-transparent font-normal tracking-wide cursor-pointer hidden sm:block"
          >
            BananaMedia
          </Link>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-[300px] relative" ref={searchRef}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search user..."
              className="w-full pl-10 pr-4 py-1.5 bg-gray-100 border-none rounded-lg focus:ring-1 focus:ring-amber-400 focus:bg-white text-sm transition-all outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowResults(true)}
            />
          </div>

          {/* Dropdown Results */}
          {showResults && searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden py-2 max-h-[300px] overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map((profile) => (
                  <Link
                    key={profile.id}
                    href={`/profile/${profile.owner}`}
                    onClick={() => {
                      setShowResults(false);
                      setSearchQuery("");
                    }}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-yellow-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-white font-bold text-xs">
                      {profile.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-800 truncate">
                        {profile.username}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {profile.bio || "Banana lover"}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="px-4 py-3 text-center text-gray-400 text-sm">
                  {allPosts.length === 0
                    ? "Wait for posts to load..."
                    : "No users found"}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-4 md:gap-5 items-center shrink-0">
          {/* Home Icon */}
          <Link href="/">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="cursor-pointer text-black hover:scale-105 transition-transform"
            >
              <path
                d="M9.005 16.545a2.997 2.997 0 0 1 2.997-2.997A2.997 2.997 0 0 1 15 16.545V22h7V11.543L12 2 2 11.543V22h7.005Z"
                fill="none"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </Link>

          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="cursor-pointer text-black hover:scale-105 transition-transform"
            onClick={() => userProfile && onCreatePostClick()}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>

          {/* Leaderboard Icon */}
          <Link href="/leaderboard" title="Top Bananas">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="cursor-pointer text-black hover:text-amber-500 hover:scale-105 transition-all"
            >
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
              <path d="M4 22h16"></path>
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
            </svg>
          </Link>

          {/* Profile Avatar */}
          {userProfile && (
            <Link href={`/profile/${userProfile.owner}`}>
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-[0.7rem] cursor-pointer hover:scale-105 transition-transform">
                {userProfile.username.charAt(0).toUpperCase()}
              </div>
            </Link>
          )}

          {/* Disconnect */}
          <Button
            onClick={() => disconnectWallet()}
            variant="ghost"
            className="text-amber-500 font-semibold hover:text-amber-600 hover:bg-amber-50 transition-colors hidden sm:block"
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
