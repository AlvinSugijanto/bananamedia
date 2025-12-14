module social_media::social_media {
    use iota::object::{Self, UID, ID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use std::string::{Self, String};
    use iota::clock::{Self, Clock};
    use iota::vec_map::{Self, VecMap};
    use std::vector;

    use iota::event;

    // ============================================================================
    // Error Codes
    // ============================================================================
    
    const EProfileAlreadyExists: u64 = 1;
    const EProfileNotFound: u64 = 2;
    const EPostNotFound: u64 = 3;
    const ENotAuthorized: u64 = 4;
    const EAlreadyLiked: u64 = 5;
    const ENotLiked: u64 = 6;

    // ============================================================================
    // Structs
    // ============================================================================

    /// Event emitted when a post is created
    public struct PostCreated has copy, drop {
        id: ID,
        author: address,
        content: String,
        created_at: u64,
    }

    /// User Profile - stores user information
    public struct UserProfile has key, store {
        id: UID,
        owner: address,
        username: String,
        bio: String,
        follower_count: u64,
        following_count: u64,
        post_count: u64,
        created_at: u64,
    }
    
    // ... (Keep existing structs)

    /// Post - represents a social media post
    public struct Post has key, store {
        id: UID,
        author: address,
        content: String,
        like_count: u64,
        comment_count: u64,
        created_at: u64,
        likes: vector<address>, // Track who liked
    }

    /// Comment - represents a comment on a post
    public struct Comment has key, store {
        id: UID,
        post_id: address,
        author: address,
        content: String,
        created_at: u64,
    }

    /// Follow relationship
    public struct Follow has key, store {
        id: UID,
        follower: address,
        following: address,
        created_at: u64,
    }

    // ============================================================================
    // Public Functions
    // ============================================================================

    // ... (create_profile, update_profile keep same)

    /// Create a new user profile
    public entry fun create_profile(
        username: vector<u8>,
        bio: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let profile = UserProfile {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            username: string::utf8(username),
            bio: string::utf8(bio),
            follower_count: 0,
            following_count: 0,
            post_count: 0,
            created_at: clock::timestamp_ms(clock),
        };
        
        transfer::public_transfer(profile, tx_context::sender(ctx));
    }

    /// Update user profile
    public entry fun update_profile(
        profile: &mut UserProfile,
        username: vector<u8>,
        bio: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(profile.owner == tx_context::sender(ctx), ENotAuthorized);
        profile.username = string::utf8(username);
        profile.bio = string::utf8(bio);
    }

    /// Create a new post
    public entry fun create_post(
        profile: &mut UserProfile,
        content: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(profile.owner == tx_context::sender(ctx), ENotAuthorized);
        
        let post_uid = object::new(ctx);
        let post_id = object::uid_to_inner(&post_uid);
        let content_str = string::utf8(content);

        // Emit event
        event::emit(PostCreated {
            id: post_id,
            author: tx_context::sender(ctx),
            content: content_str,
            created_at: clock::timestamp_ms(clock),
        });

        let post = Post {
            id: post_uid,
            author: tx_context::sender(ctx),
            content: content_str,
            like_count: 0,
            comment_count: 0,
            created_at: clock::timestamp_ms(clock),
            likes: vector::empty<address>(),
        };
        
        profile.post_count = profile.post_count + 1;
        
        // Transfer post to sender
        transfer::public_transfer(post, tx_context::sender(ctx));
    }

    /// Like a post
    public entry fun like_post(
        post: &mut Post,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let likes = &mut post.likes;
        
        // Check if already liked
        let len = vector::length(likes);
        let mut i = 0;
        let mut already_liked = false;
        
        while (i < len) {
            if (*vector::borrow(likes, i) == sender) {
                already_liked = true;
                break
            };
            i = i + 1;
        };
        
        assert!(!already_liked, EAlreadyLiked);
        
        vector::push_back(likes, sender);
        post.like_count = post.like_count + 1;
    }

    /// Unlike a post
    public entry fun unlike_post(
        post: &mut Post,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let likes = &mut post.likes;
        
        let len = vector::length(likes);
        let mut i = 0;
        let mut found_index = len; // Use len as "not found" marker
        
        while (i < len) {
            if (*vector::borrow(likes, i) == sender) {
                found_index = i;
                break
            };
            i = i + 1;
        };
        
        assert!(found_index < len, ENotLiked);
        
        vector::remove(likes, found_index);
        post.like_count = post.like_count - 1;
    }

    /// Create a comment on a post
    public entry fun create_comment(
        post: &mut Post,
        content: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let comment = Comment {
            id: object::new(ctx),
            post_id: object::uid_to_address(&post.id),
            author: tx_context::sender(ctx),
            content: string::utf8(content),
            created_at: clock::timestamp_ms(clock),
        };
        
        post.comment_count = post.comment_count + 1;
        
        transfer::public_transfer(comment, tx_context::sender(ctx));
    }

    /// Follow a user
    public entry fun follow_user(
        follower_profile: &mut UserProfile,
        following_address: address,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(follower_profile.owner == tx_context::sender(ctx), ENotAuthorized);
        
        let follow = Follow {
            id: object::new(ctx),
            follower: tx_context::sender(ctx),
            following: following_address,
            created_at: clock::timestamp_ms(clock),
        };
        
        follower_profile.following_count = follower_profile.following_count + 1;
        
        transfer::public_transfer(follow, tx_context::sender(ctx));
    }

    /// Share/transfer a post to another user
    public entry fun share_post(
        post: Post,
        recipient: address,
        _ctx: &mut TxContext
    ) {
        transfer::public_transfer(post, recipient);
    }

    // ============================================================================
    // Getter Functions
    // ============================================================================

    public fun get_username(profile: &UserProfile): String {
        profile.username
    }

    public fun get_bio(profile: &UserProfile): String {
        profile.bio
    }

    public fun get_follower_count(profile: &UserProfile): u64 {
        profile.follower_count
    }

    public fun get_following_count(profile: &UserProfile): u64 {
        profile.following_count
    }

    public fun get_post_count(profile: &UserProfile): u64 {
        profile.post_count
    }

    public fun get_post_content(post: &Post): String {
        post.content
    }

    public fun get_post_author(post: &Post): address {
        post.author
    }

    public fun get_like_count(post: &Post): u64 {
        post.like_count
    }

    public fun get_comment_count(post: &Post): u64 {
        post.comment_count
    }
}
