"use client";
import { useState } from "react";
import styles from "./CommunityTab.module.css";
import { LayerConfig } from "@/types";

const MY_AVATAR = "/community/bitboy.jpg";

interface Comment {
    id: string;
    user: string;
    avatar: string;
    text: string;
    time: string;
}
import { DitherBackground } from "../ui/DitherBackground";

interface Post {
    id: string;
    user: string;
    avatar: string;
    handle: string;
    time: string;
    image: string;
    title: string;
    tags: string[];
    likes: number;
    liked: boolean;
    comments: Comment[];
    layers: string[];
    recipeUrl?: string;
}

const MOCK_POSTS: Post[] = [
    {
        id: "1",
        user: "bitboy",
        avatar: "/community/bitboy.jpg",
        handle: "@bitboy",
        time: "2h ago",
        image: "/community/bitboy-lab-1773309729814.jpg",
        title: "Nice Blocks",
        tags: ["tileset", "dither", "glitch"],
        likes: 156,
        liked: false,
        layers: ["SOURCE", "GLITCH", "TILESET_DITHER", "DITHER"],
        recipeUrl: "/community/nice_blocks.json",
        comments: [
            { id: "c1", user: "kimbow", avatar: "/community/0014536829_10.jpg", text: "those blocks hit different!", time: "1h ago" },
        ],
    },
    {
        id: "2",
        user: "pixel_kid",
        avatar: "/community/0014536829_10.jpg",
        handle: "@pixel_kid",
        time: "5h ago",
        image: "/community/bitboy-lab-1773312865193.jpg",
        title: "Supa Glitch",
        tags: ["pixel_sort", "glitch", "noise"],
        likes: 243,
        liked: true,
        layers: ["SOURCE", "PIXEL_SORT", "BLOCK_GLITCH", "POSTERIZE"],
        recipeUrl: "/community/supa_glitch.json",
        comments: [
            { id: "c3", user: "bitboy", avatar: "/community/bitboy.jpg", text: "insane sorting on this one", time: "4h ago" },
        ],
    },
];

const MOCK_USERS = [
    { user: "bitboy", avatar: "/community/bitboy.jpg", followers: 1250 },
    { user: "pixel_kid", avatar: "/community/0014536829_10.jpg", followers: 840 },
];

interface CommunityTabProps {
    onLoadRecipe?: (layers: LayerConfig[]) => void;
}

export default function CommunityTab({ onLoadRecipe }: CommunityTabProps) {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loginStep, setLoginStep] = useState<"idle" | "form">("idle");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
    const [openComments, setOpenComments] = useState<string | null>(null);
    const [newComment, setNewComment] = useState("");
    const [activeTab, setActiveTab] = useState<"feed" | "profile">("feed");
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareTitle, setShareTitle] = useState("");
    const [shareTags, setShareTags] = useState("");

    const handleLogin = () => {
        if (username.length > 0) {
            setIsLoggedIn(true);
            setLoginStep("idle");
        }
    };

    const toggleLike = (postId: string) => {
        setPosts(prev => prev.map(p => p.id === postId
            ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
            : p
        ));
    };

    const submitComment = (postId: string) => {
        if (!newComment.trim() || !isLoggedIn) return;
        const comment: Comment = {
            id: Math.random().toString(36).slice(2),
            user: username || "you",
            avatar: MY_AVATAR,
            text: newComment,
            time: "just now",
        };
        setPosts(prev => prev.map(p => p.id === postId
            ? { ...p, comments: [...p.comments, comment] }
            : p
        ));
        setNewComment("");
    };

    const handleLoadRecipeClick = async (recipeUrl?: string) => {
        if (!recipeUrl || !onLoadRecipe) return;
        try {
            const response = await fetch(recipeUrl);
            const data = await response.json();
            if (data && data.layers) {
                onLoadRecipe(data.layers);
            }
        } catch (error) {
            console.error("Failed to load recipe:", error);
        }
    };

    // ─── Post Card ──────────────────────────────────────────────────────────────
    const renderPost = (post: Post) => {
        const isOpen = openComments === post.id;

        return (
            <div key={post.id} className={styles.postCard}>
                {/* Post image thumbnail */}
                <div className={styles.postThumb} onClick={() => handleLoadRecipeClick(post.recipeUrl)}>
                    <img src={post.image} alt={post.title} className={styles.postImage} />
                    <div className={styles.postThumbOverlay}>
                        <div className={styles.layerTags}>
                            {post.layers.map(l => <span key={l} className={styles.layerTag}>{l}</span>)}
                        </div>
                    </div>
                </div>

                {/* Post meta & title */}
                <div className={styles.postMeta}>
                    <img src={post.avatar} alt={post.user} className={styles.postAvatar} />
                    <div className={styles.postUserInfo}>
                        <span className={styles.postTitle}>{post.title}</span>
                        <span className={styles.postUser}>{post.user}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className={styles.postActions}>
                    <button
                        className={`${styles.actionBtn} ${post.liked ? styles.liked : ""}`}
                        onClick={() => toggleLike(post.id)}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={post.liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        <span>{post.likes}</span>
                    </button>
                    <button
                        className={styles.actionBtn}
                        onClick={() => setOpenComments(isOpen ? null : post.id)}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                        <span>{post.comments.length}</span>
                    </button>
                    <button 
                        className={styles.loadBtn} 
                        onClick={() => handleLoadRecipeClick(post.recipeUrl)}
                        title="Load Recipe"
                    >
                        LOAD
                    </button>
                </div>

                {/* Comments */}
                {isOpen && (
                    <div className={styles.commentsSection}>
                        {post.comments.map(c => (
                            <div key={c.id} className={styles.commentRow}>
                                <img src={c.avatar} alt={c.user} className={styles.commentAvatar} />
                                <div className={styles.commentContent}>
                                    <span className={styles.commentUser}>{c.user}</span>
                                    <span className={styles.commentText}>{c.text}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // ─── Login Screen ───────────────────────────────────────────────────────────
    if (!isLoggedIn && loginStep === "form") {
        return (
            <div className={styles.loginWrap}>
                <DitherBackground />
                <div className={styles.loginCard}>
                    <div className={styles.terminalHeader}>
                        <span className={styles.terminalPrompt}>&gt;</span>
                        <span className={styles.terminalTitle}>ACCESS_DENIED: AUTHENTICATION_REQUIRED</span>
                    </div>
                    <p className={styles.loginSub}>INITIALIZING SESSION_LOGIN...</p>
                    <input
                        className={styles.loginInput}
                        placeholder="k1mb0xnau7@gmail.com"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleLogin()}
                    />
                    <input
                        className={styles.loginInput}
                        type="password"
                        placeholder="........"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleLogin()}
                    />
                    <button className={styles.loginBtn} onClick={handleLogin}>SIGN IN</button>
                    <button className={styles.loginLink} onClick={() => setLoginStep("idle")}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 4}}>
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        BACK
                    </button>
                </div>
            </div>
        );
    }

    // ─── Share Modal ─────────────────────────────────────────────────────────
    const ShareModal = () => (
        <div className={styles.modalOverlay} onClick={() => setShareModalOpen(false)}>
            <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
                <div className={styles.modalTitle}>Share Recipe</div>
                <input
                    className={styles.loginInput}
                    placeholder="Recipe name..."
                    value={shareTitle}
                    onChange={e => setShareTitle(e.target.value)}
                />
                <input
                    className={styles.loginInput}
                    placeholder="Tags: crt, vhs, glitch..."
                    value={shareTags}
                    onChange={e => setShareTags(e.target.value)}
                />
                <div className={styles.modalNote}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: 4, verticalAlign: "middle"}}>
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                    </svg>
                    Current layer stack will be attached
                </div>
                <button className={styles.loginBtn} onClick={() => {
                    const tags = shareTags.split(",").map(t => t.trim()).filter(Boolean);
                    const newPost: Post = {
                        id: Math.random().toString(36).slice(2),
                        user: username,
                        avatar: MY_AVATAR,
                        handle: `@${username}`,
                        time: "just now",
                        image: "/community/post1.png",
                        title: shareTitle || "Untitled Recipe",
                        tags,
                        likes: 0,
                        liked: false,
                        layers: ["CUSTOM"],
                        comments: [],
                    };
                    setPosts(prev => [newPost, ...prev]);
                    setShareModalOpen(false);
                    setShareTitle("");
                    setShareTags("");
                }}>Publish</button>
                <button className={styles.loginLink} onClick={() => setShareModalOpen(false)}>Cancel</button>
            </div>
        </div>
    );

    // ─── Profile tab ─────────────────────────────────────────────────────────
    const ProfileTab = () => (
        <div className={styles.profileWrap}>
            <div className={styles.profileHeader}>
                <img src={MY_AVATAR} alt="me" className={styles.profileAvatar} />
                <div>
                    <div className={styles.profileName}>{username || "bitboy_lab"}</div>
                    <div className={styles.profileHandle}>@{username || "bitboy_lab"}</div>
                    <div className={styles.profileStats}>
                        <span>2 recipes</span>
                        <span>159 likes</span>
                        <span>48 followers</span>
                    </div>
                </div>
            </div>
            <div className={styles.profileSectionLabel}>My Recipes</div>
            <div className={styles.grid}>
                {posts.filter(p => p.avatar === MY_AVATAR || p.user === username).map(renderPost)}
            </div>
        </div>
    );

    return (
        <div className={styles.communityWrap}>
            <div className={styles.topBar}>
                <div className={styles.topLogo}>
                    BITBOY <span className={styles.labAccent}>RECIPE LAB</span>
                </div>
                <div className={styles.topBarRight}>
                    {isLoggedIn ? (
                        <>
                            <button className={styles.shareBtn} onClick={() => setShareModalOpen(true)}>SHARE</button>
                            <img src={MY_AVATAR} className={styles.myAvatar} alt="Profile" onClick={() => setActiveTab("profile")} />
                        </>
                    ) : (
                        <button className={styles.signInBtn} onClick={() => setLoginStep("form")}>SIGN IN</button>
                    )}
                </div>
            </div>

            <div className={styles.feedScroll}>
                {activeTab === "profile" && isLoggedIn ? (
                    <ProfileTab />
                ) : (
                    <>
                        {!isLoggedIn && (
                            <div className={styles.loginBanner} onClick={() => setLoginStep("form")}>
                                <div style={{display: "flex", alignItems: "center", gap: 8}}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="4" y1="21" x2="4" y2="14"></line>
                                        <line x1="4" y1="10" x2="4" y2="3"></line>
                                        <line x1="12" y1="21" x2="12" y2="12"></line>
                                        <line x1="12" y1="8" x2="12" y2="3"></line>
                                        <line x1="20" y1="21" x2="20" y2="16"></line>
                                        <line x1="20" y1="12" x2="20" y2="3"></line>
                                        <line x1="1" y1="14" x2="7" y2="14"></line>
                                        <line x1="9" y1="8" x2="15" y2="8"></line>
                                        <line x1="17" y1="16" x2="23" y2="16"></line>
                                    </svg>
                                    <span>Sign in to like, comment & share recipes</span>
                                </div>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.bannerArrow}>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                    <polyline points="12 5 19 12 12 19"></polyline>
                                </svg>
                            </div>
                        )}
                        <div className={styles.grid}>
                            {posts.map(renderPost)}
                        </div>
                    </>
                )}
            </div>

            {shareModalOpen && <ShareModal />}
        </div>
    );
}
