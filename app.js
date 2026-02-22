// Instagram Clone - Frontend Application
// Connected to Node.js + SQLite Backend

const API_URL = '/api';

// ============================================
// STATE MANAGEMENT
// ============================================

class AppState {
    constructor() {
        this.currentUser = null;
        this.posts = [];
        this.token = localStorage.getItem('token');
        this.isLoggedIn = !!this.token;
    }

    saveToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    getAuthHeader() {
        return this.token ? { Authorization: `Bearer ${this.token}` } : {};
    }
}

const appState = new AppState();

// ============================================
// API FUNCTIONS
// ============================================

const api = {
    // Auth
    async register(data) {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async login(data) {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async verify() {
        const res = await fetch(`${API_URL}/auth/verify`, {
            headers: appState.getAuthHeader()
        });
        return res.json();
    },

    // Users
    async getProfile() {
        const res = await fetch(`${API_URL}/users/profile`, {
            headers: appState.getAuthHeader()
        });
        return res.json();
    },

    async getAdminStats() {
        const res = await fetch(`${API_URL}/users/admin/stats`, {
            headers: appState.getAuthHeader()
        });
        return res.json();
    },

    async getAllUsers() {
        const res = await fetch(`${API_URL}/users/admin/all-users`, {
            headers: appState.getAuthHeader()
        });
        return res.json();
    },

    async deleteUser(userId) {
        const res = await fetch(`${API_URL}/users/admin/user/${userId}`, {
            method: 'DELETE',
            headers: appState.getAuthHeader()
        });
        return res.json();
    },

    async getUserByUsername(username) {
        const res = await fetch(`${API_URL}/users/username/${username}`, {
            headers: appState.getAuthHeader()
        });
        return res.json();
    },

    async updateProfile(formData) {
        const res = await fetch(`${API_URL}/users/profile`, {
            method: 'PUT',
            headers: appState.getAuthHeader(),
            body: formData
        });
        return res.json();
    },

    async getSuggestions() {
        const res = await fetch(`${API_URL}/users/suggestions`, {
            headers: appState.getAuthHeader()
        });
        return res.json();
    },

    async followUser(userId) {
        const res = await fetch(`${API_URL}/users/follow/${userId}`, {
            method: 'POST',
            headers: appState.getAuthHeader()
        });
        return res.json();
    },

    async unfollowUser(userId) {
        const res = await fetch(`${API_URL}/users/follow/${userId}`, {
            method: 'DELETE',
            headers: appState.getAuthHeader()
        });
        return res.json();
    },

    // Posts
    async getFeed() {
        const res = await fetch(`${API_URL}/posts/feed`, {
            headers: appState.getAuthHeader()
        });
        return res.json();
    },

    async getUserPosts(userId) {
        const res = await fetch(`${API_URL}/posts/user/${userId}`, {
            headers: appState.getAuthHeader()
        });
        return res.json();
    },

    async createPost(formData) {
        const res = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: appState.getAuthHeader(),
            body: formData
        });
        return res.json();
    },

    async deletePost(postId) {
        const res = await fetch(`${API_URL}/posts/${postId}`, {
            method: 'DELETE',
            headers: appState.getAuthHeader()
        });
        return res.json();
    },

    async likePost(postId) {
        const res = await fetch(`${API_URL}/posts/${postId}/like`, {
            method: 'POST',
            headers: appState.getAuthHeader()
        });
        return res.json();
    },

    async unlikePost(postId) {
        const res = await fetch(`${API_URL}/posts/${postId}/like`, {
            method: 'DELETE',
            headers: appState.getAuthHeader()
        });
        return res.json();
    },

    async addComment(postId, text) {
        const res = await fetch(`${API_URL}/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                ...appState.getAuthHeader(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });
        return res.json();
    },

    // Stories
    async getStories() {
        const res = await fetch(`${API_URL}/stories`, {
            headers: appState.getAuthHeader()
        });
        return res.json();
    },

    async createStory(formData) {
        const res = await fetch(`${API_URL}/stories`, {
            method: 'POST',
            headers: appState.getAuthHeader(),
            body: formData
        });
        return res.json();
    },

    async getExplore() {
        const res = await fetch(`${API_URL}/posts/explore`, {
            headers: appState.getAuthHeader()
        });
        return res.json();
    },

    async searchUsers(query) {
        const res = await fetch(`${API_URL}/users/search?q=${query}`, {
            headers: appState.getAuthHeader()
        });
        return res.json();
    },

    // Groups
    async getGroups() {
        const res = await fetch(`${API_URL}/groups`, {
            headers: appState.getAuthHeader()
        });
        return res.json();
    },

    async getGroupMessages(groupId) {
        const res = await fetch(`${API_URL}/groups/${groupId}/messages`, {
            headers: appState.getAuthHeader()
        });
        return res.json();
    },

    async sendGroupMessage(groupId, text) {
        const res = await fetch(`${API_URL}/groups/${groupId}/messages`, {
            method: 'POST',
            headers: {
                ...appState.getAuthHeader(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });
        return res.json();
    }
};

// ============================================
// STATE ENHANCEMENT
// ============================================

appState.groups = [];
appState.activeGroupId = null;

// ============================================
// DOM ELEMENTS
// ============================================

const elements = {
    // Screens
    authScreen: document.getElementById('auth-screen'),
    signupScreen: document.getElementById('signup-screen'),
    mainApp: document.getElementById('main-app'),

    // Auth forms
    loginForm: document.getElementById('login-form'),
    signupForm: document.getElementById('signup-form'),
    showSignup: document.getElementById('show-signup'),
    showLogin: document.getElementById('show-login'),

    // Navigation
    navItems: document.querySelectorAll('.nav-item[data-view]'),
    views: document.querySelectorAll('.view'),

    // Post elements
    postsFeed: document.getElementById('posts-feed'),
    exploreGrid: document.getElementById('explore-grid'),
    profilePosts: document.getElementById('profile-posts'),

    // Create post
    createDropzone: document.getElementById('create-dropzone'),
    fileInput: document.getElementById('file-input'),
    createPreview: document.getElementById('create-preview'),
    previewImage: document.getElementById('preview-image'),
    removeImage: document.getElementById('remove-image'),
    createCaption: document.getElementById('create-caption'),
    sharePost: document.getElementById('share-post'),
    cancelCreate: document.getElementById('cancel-create'),

    // Profile
    profileAvatar: document.getElementById('profile-avatar'),
    profileUsername: document.getElementById('profile-username'),
    profileName: document.getElementById('profile-name'),
    profileBio: document.getElementById('profile-bio-text'),
    postCount: document.getElementById('post-count'),
    followerCount: document.getElementById('follower-count'),
    followingCount: document.getElementById('following-count'),
    editProfile: document.getElementById('edit-profile'),
    editProfileModal: document.getElementById('edit-profile-modal'),
    editProfileForm: document.getElementById('edit-profile-form'),
    avatarUpload: document.getElementById('avatar-upload'),
    editAvatarPreview: document.getElementById('edit-avatar-preview'),
    editName: document.getElementById('edit-name'),
    editPhone: document.getElementById('edit-phone'),
    editAge: document.getElementById('edit-age'),
    editSchool: document.getElementById('edit-school'),
    editGrade: document.getElementById('edit-grade'),
    editBio: document.getElementById('edit-bio'),

    // Suggestions
    suggestionsList: document.getElementById('suggestions-list'),

    // Modal
    postModal: document.getElementById('post-modal'),
    modalPost: document.getElementById('modal-post'),
    closeModal: document.querySelector('.close-modal'),

    // Messages
    messageInput: document.getElementById('message-input'),
    sendMessage: document.getElementById('send-message'),
    chatMessages: document.getElementById('chat-messages'),

    // Search
    searchInput: document.getElementById('search-input'),

    // Toast
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message'),

    // Logout
    logoutBtn: document.getElementById('logout-btn'),

    // Current user avatar in nav
    currentUserAvatar: document.getElementById('current-user-avatar'),

    // Stories
    storiesList: document.getElementById('stories-list'),
    addStoryBtn: document.getElementById('add-story-btn'),
    storyUserAvatar: document.getElementById('story-user-avatar'),

    // Groups (Messaging)
    conversationsList: document.getElementById('conversations-list'),
    chatHeader: document.getElementById('chat-header')
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showToast(message, duration = 3000) {
    elements.toastMessage.textContent = message;
    elements.toast.classList.add('show');
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, duration);
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function showView(viewId) {
    elements.views.forEach(v => v.classList.remove('active'));
    elements.navItems.forEach(n => n.classList.remove('active'));

    const view = document.getElementById(`${viewId}-view`);
    const navItem = document.querySelector(`.nav-item[data-view="${viewId}"]`);

    if (view) view.classList.add('active');
    if (navItem) navItem.classList.add('active');
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
}

// ============================================
// AUTHENTICATION
// ============================================

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    const result = await api.login({ username, password });

    if (result.error) {
        showToast(result.error);
        return;
    }

    appState.saveToken(result.token);
    appState.currentUser = result.user;
    appState.isLoggedIn = true;

    showScreen('main-app');
    showView('home');
    renderAll();
    showToast('Welcome back! 👋');
}

async function handleSignup(e) {
    e.preventDefault();
    const username = document.getElementById('signup-username').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const name = document.getElementById('signup-fullname').value;
    const phone = document.getElementById('signup-phone').value;
    const age = document.getElementById('signup-age').value;
    const grade = document.getElementById('signup-grade').value;
    const school = document.getElementById('signup-school').value;

    const result = await api.register({ username, email, password, name, phone, age, grade, school });

    if (result.error) {
        showToast(result.error);
        return;
    }

    appState.saveToken(result.token);
    appState.currentUser = result.user;
    appState.isLoggedIn = true;

    showScreen('main-app');
    showView('home');
    renderAll();
    showToast('Welcome to Instagram! 🎉');
}

async function logout() {
    appState.clearToken();
    appState.currentUser = null;
    appState.isLoggedIn = false;
    showScreen('auth-screen');
    showToast('Logged out successfully');
}

async function checkAuth() {
    if (!appState.token) return false;

    const result = await api.verify();
    if (result.error) {
        appState.clearToken();
        return false;
    }

    appState.currentUser = result.user;
    return true;
}

// ============================================
// RENDERING FUNCTIONS
// ============================================

async function renderPosts() {
    if (!appState.isLoggedIn) return;

    const posts = await api.getFeed();
    appState.posts = posts;

    if (!posts || posts.length === 0) {
        elements.postsFeed.innerHTML = '<p style="text-align:center;padding:40px;color:#8e8e8e;">No posts yet. Follow some users or create your first post!</p>';
        return;
    }

    elements.postsFeed.innerHTML = posts.map(post => {
        const commentsHtml = (post.comments || []).slice(0, 2).map(c => `
            <div class="post-comment">
                <span class="username">${c.username}</span>
                ${c.text}
            </div>
        `).join('');

        return `
            <article class="post" data-post-id="${post.id}">
                <header class="post-header">
                    <img src="${post.avatar || 'https://via.placeholder.com/32'}" alt="${post.username}">
                    <span class="username">${post.username}</span>
                    <i class="fas fa-ellipsis-h options"></i>
                </header>
                <img src="${post.image}" alt="Post" class="post-image" data-post-id="${post.id}">
                <div class="post-actions">
                    <i class="far fa-heart like-btn ${post.liked ? 'liked' : ''}" data-post-id="${post.id}"></i>
                    <i class="far fa-comment"></i>
                    <i class="far fa-paper-plane"></i>
                    <i class="far fa-bookmark save-btn"></i>
                </div>
                <div class="post-likes">
                    <span>${post.like_count || 0} likes</span>
                </div>
                <div class="post-caption">
                    <span class="username">${post.username}</span>
                    ${post.caption || ''}
                </div>
                ${commentsHtml ? `<div class="post-comments">${commentsHtml}</div>` : ''}
                <div class="post-comments-count">
                    View all ${post.comment_count || 0} comments
                </div>
                <div class="post-time">${formatTimeAgo(post.created_at)}</div>
                <div class="post-comment-input">
                    <i class="far fa-smile"></i>
                    <input type="text" placeholder="Add a comment..." data-post-id="${post.id}">
                    <button class="post-comment-btn" data-post-id="${post.id}" disabled>Post</button>
                </div>
            </article>
        `;
    }).join('');

    // Add event listeners for likes
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', handleLike);
    });

    // Add event listeners for comment inputs
    document.querySelectorAll('.post-comment-input input').forEach(input => {
        input.addEventListener('input', handleCommentInput);
    });

    // Add event listeners for comment buttons
    document.querySelectorAll('.post-comment-btn').forEach(btn => {
        btn.addEventListener('click', handleComment);
    });

    // Add event listeners for post images (modal)
    document.querySelectorAll('.post-image').forEach(img => {
        img.addEventListener('click', openPostModal);
    });
}

async function renderExplore() {
    if (!appState.isLoggedIn) return;

    const posts = await api.getExplore();

    if (!posts || posts.length === 0) {
        elements.exploreGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #8e8e8e;">No explore posts available yet.</p>';
        return;
    }

    elements.exploreGrid.innerHTML = posts.map(post => `
        <div class="explore-item" data-post-id="${post.id}">
            <img src="${post.image}" alt="Explore">
            <div class="explore-overlay">
                <span><i class="fas fa-heart"></i> ${post.like_count || 0}</span>
                <span><i class="fas fa-comment"></i> ${post.comment_count || 0}</span>
            </div>
        </div>
    `).join('');

    // Add click handlers for explore items
    document.querySelectorAll('.explore-item').forEach(item => {
        item.addEventListener('click', () => {
            const postId = item.dataset.postId;
            openPostModalById(postId);
        });
    });
}

async function renderStories() {
    if (!appState.isLoggedIn) return;

    const storyGroups = await api.getStories();

    // Update "Your Story" avatar
    if (appState.currentUser && elements.storyUserAvatar) {
        elements.storyUserAvatar.src = appState.currentUser.avatar || 'https://via.placeholder.com/100';
    }

    if (!storyGroups || storyGroups.length === 0) {
        // Keep only the "Add Story" button
        const addBtn = elements.storiesList.querySelector('.add-story');
        elements.storiesList.innerHTML = '';
        elements.storiesList.appendChild(addBtn);
        return;
    }

    const storiesHtml = storyGroups.map(group => `
        <div class="story" data-user-id="${group.user.id}">
            <div class="story-ring">
                <img src="${group.user.avatar || 'https://via.placeholder.com/100'}" alt="${group.user.username}">
            </div>
            <span>${group.user.username}</span>
        </div>
    `).join('');

    const addBtn = elements.storiesList.querySelector('.add-story');
    elements.storiesList.innerHTML = '';
    elements.storiesList.appendChild(addBtn);
    elements.storiesList.insertAdjacentHTML('beforeend', storiesHtml);

    // Add click event for viewing stories (to be implemented)
    document.querySelectorAll('.story:not(.add-story)').forEach(story => {
        story.addEventListener('click', () => {
            const userId = story.dataset.userId;
            const group = storyGroups.find(g => g.user.id == userId);
            viewStory(group);
        });
    });
}

function viewStory(group) {
    if (!group || !group.items || group.items.length === 0) return;

    // Simple story viewer using a modal-like behavior for now
    showToast(`Viewing stories from ${group.user.username}...`);
    // Full story viewer would need a separate UI component
}

async function createNewStory() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('image', file);

            showToast('Uploading story...');
            const result = await api.createStory(formData);

            if (!result.error) {
                showToast('Story shared! ✨');
                renderStories();
            } else {
                showToast(result.error);
            }
        }
    };
    input.click();
}

async function renderProfile() {
    if (!appState.currentUser) return;

    const user = appState.currentUser;
    const userPosts = await api.getUserPosts(user.id);

    elements.profileAvatar.src = user.avatar || 'https://via.placeholder.com/200';
    elements.profileUsername.textContent = user.username;
    elements.profileName.textContent = user.name || user.username;
    elements.profileBio.innerHTML = (user.bio || 'No bio yet').replace(/\n/g, '<br>');
    elements.postCount.textContent = userPosts?.length || 0;
    elements.followerCount.textContent = (user.followers || 0).toLocaleString();
    elements.followingCount.textContent = user.following || 0;

    // Render profile posts
    elements.profilePosts.innerHTML = (userPosts || []).map(post => `
        <div class="profile-post" data-post-id="${post.id}">
            <img src="${post.image}" alt="Post">
            <div class="profile-post-overlay">
                <span><i class="fas fa-heart"></i> ${post.like_count || 0}</span>
                <span><i class="fas fa-comment"></i> ${post.comment_count || 0}</span>
            </div>
        </div>
    `).join('');

    // Add click handlers for profile posts
    document.querySelectorAll('.profile-post').forEach(post => {
        post.addEventListener('click', () => {
            const postId = parseInt(post.dataset.postId);
            openPostModalById(postId);
        });
    });
}

async function renderSuggestions() {
    const suggestions = await api.getSuggestions();

    if (!suggestions || suggestions.length === 0) {
        elements.suggestionsList.innerHTML = '<p style="padding:10px;color:#8e8e8e;">No suggestions available</p>';
        return;
    }

    elements.suggestionsList.innerHTML = suggestions.map(s => `
        <div class="suggestion-item">
            <img src="${s.avatar || 'https://via.placeholder.com/32'}" alt="${s.username}">
            <div class="suggestion-info">
                <span class="username">${s.username}</span>
                <span class="followers">Suggested for you</span>
            </div>
            <button class="follow-suggestion-btn" data-user-id="${s.id}" data-username="${s.username}">Follow</button>
        </div>
    `).join('');

    // Add follow button handlers
    document.querySelectorAll('.follow-suggestion-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const userId = btn.dataset.userId;
            const username = btn.dataset.username;

            if (btn.textContent === 'Follow') {
                await api.followUser(userId);
                btn.textContent = 'Following';
                showToast(`You're now following ${username}`);
            } else {
                await api.unfollowUser(userId);
                btn.textContent = 'Follow';
            }
        });
    });
}

async function renderAll() {
    await renderPosts();
    await renderStories();
    renderExplore();
    await renderProfile();
    await renderSuggestions();
    await renderGroups();

    // Update current user avatar in nav
    elements.currentUserAvatar.src = appState.currentUser?.avatar || 'https://via.placeholder.com/24';

    // Show/hide admin nav based on user role
    const adminNavItem = document.getElementById('admin-nav-item');
    if (adminNavItem) {
        adminNavItem.style.display = appState.currentUser?.is_admin ? 'flex' : 'none';
    }
}

async function renderAdmin() {
    if (!appState.currentUser?.is_admin) {
        showView('home');
        return;
    }

    const stats = await api.getAdminStats();
    if (stats.error) {
        showToast(stats.error);
        return;
    }

    document.getElementById('stat-total-users').textContent = stats.totalUsers || 0;
    document.getElementById('stat-total-posts').textContent = stats.totalPosts || 0;
    document.getElementById('stat-total-likes').textContent = stats.totalLikes || 0;
    document.getElementById('stat-total-comments').textContent = stats.totalComments || 0;

    // Render grade stats
    const gradeStatsDiv = document.getElementById('grade-stats');
    if (stats.usersByGrade && stats.usersByGrade.length > 0) {
        gradeStatsDiv.innerHTML = stats.usersByGrade.map(g => `
            <div class="grade-item">
                <span class="grade-name">${g.grade || 'Not specified'}</span>
                <span class="grade-count">${g.count} users</span>
            </div>
        `).join('');
    } else {
        gradeStatsDiv.innerHTML = '<p>No grade data available</p>';
    }

    // Render all users
    const users = await api.getAllUsers();
    const usersBody = document.getElementById('admin-users-body');
    if (users && users.length > 0) {
        usersBody.innerHTML = users.map(u => `
            <tr>
                <td>${u.username}</td>
                <td>${u.email}</td>
                <td>${u.phone || '-'}</td>
                <td>${u.age || '-'}</td>
                <td>${u.grade || '-'}</td>
                <td>${u.school || '-'}</td>
                <td>
                    ${!u.is_admin ? `<button class="delete-user-btn" data-user-id="${u.id}" style="background:#ed4956;color:white;padding:5px 10px;border:none;border-radius:3px;cursor:pointer;">Delete</button>` : '<span style="color:#8e8e8e;">Admin</span>'}
                </td>
            </tr>
        `).join('');

        // Add delete handlers
        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const userId = btn.dataset.userId;
                if (confirm('Are you sure you want to delete this user?')) {
                    const result = await api.deleteUser(userId);
                    if (!result.error) {
                        showToast('User deleted');
                        renderAdmin();
                    } else {
                        showToast(result.error);
                    }
                }
            });
        });
    } else {
        usersBody.innerHTML = '<tr><td colspan="7">No users found</td></tr>';
    }
}

// ============================================
// EVENT HANDLERS
// ============================================

async function handleLike(e) {
    const postId = e.target.dataset.postId;
    const post = appState.posts.find(p => p.id == postId);

    if (post.liked) {
        const result = await api.unlikePost(postId);
        if (!result.error) {
            e.target.classList.remove('liked');
            const likesSpan = e.target.closest('.post').querySelector('.post-likes span');
            likesSpan.textContent = `${result.likes} likes`;
        }
    } else {
        const result = await api.likePost(postId);
        if (!result.error) {
            e.target.classList.add('liked');
            e.target.classList.add('like-animation');
            setTimeout(() => e.target.classList.remove('like-animation'), 300);
            const likesSpan = e.target.closest('.post').querySelector('.post-likes span');
            likesSpan.textContent = `${result.likes} likes`;
        }
    }
}

function handleCommentInput(e) {
    const postId = e.target.dataset.postId;
    const btn = document.querySelector(`.post-comment-btn[data-post-id="${postId}"]`);
    btn.disabled = !e.target.value.trim();
}

async function handleComment(e) {
    const postId = e.target.dataset.postId;
    const input = document.querySelector(`.post-comment-input input[data-post-id="${postId}"]`);
    const text = input.value.trim();

    if (text) {
        const result = await api.addComment(postId, text);
        if (!result.error) {
            input.value = '';
            e.target.disabled = true;
            renderPosts();
            showToast('Comment added!');
        }
    }
}

function openPostModal(e) {
    const postId = e.target.dataset.postId;
    openPostModalById(postId);
}

function openPostModalById(postId) {
    const post = appState.posts.find(p => p.id == postId);
    if (!post) return;

    elements.modalPost.innerHTML = `
        <img src="${post.image}" alt="Post">
        <div class="post-header">
            <img src="${post.avatar || 'https://via.placeholder.com/32'}" alt="${post.username}">
            <span class="username">${post.username}</span>
        </div>
        <div class="modal-comments">
            <div class="post-caption">
                <span class="username">${post.username}</span>
                ${post.caption || ''}
            </div>
            ${(post.comments || []).map(c => `
                <div class="post-comment">
                    <span class="username">${c.username}</span>
                    ${c.text}
                </div>
            `).join('')}
        </div>
    `;

    elements.postModal.classList.add('active');
}

function closePostModal() {
    elements.postModal.classList.remove('active');
}

// Create post handlers
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            elements.previewImage.src = e.target.result;
            elements.createPreview.style.display = 'block';
            elements.createDropzone.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

function loadImageFromUrl() {
    const urlInput = document.getElementById('image-url-input');
    const url = urlInput.value.trim();

    if (url) {
        elements.previewImage.src = url;
        elements.createPreview.style.display = 'block';
        elements.createDropzone.style.display = 'none';
        urlInput.value = '';
    }
}

function removeImage() {
    elements.previewImage.src = '';
    elements.createPreview.style.display = 'none';
    elements.createDropzone.style.display = 'block';
    elements.fileInput.value = '';
    elements.createCaption.value = '';

    // Clear URL input
    const urlInput = document.getElementById('image-url-input');
    if (urlInput) urlInput.value = '';
}

async function shareNewPost() {
    const file = elements.fileInput.files[0];
    const caption = elements.createCaption.value.trim();
    const imageSrc = elements.previewImage.src;

    // Check if image is from URL or file upload
    let isUrlImage = false;
    if (imageSrc && !imageSrc.startsWith('data:') && imageSrc !== window.location.href) {
        isUrlImage = true;
    }

    if (!file && !imageSrc) {
        showToast('Please add an image');
        return;
    }

    const formData = new FormData();

    if (file) {
        formData.append('image', file);
    } else if (isUrlImage) {
        // For URL images, we store the URL directly
        formData.append('image', imageSrc);
    }

    formData.append('caption', caption);

    const result = await api.createPost(formData);

    if (result.error) {
        showToast(result.error);
        return;
    }

    removeImage();
    showView('home');
    renderAll();
    showToast('Post shared! 🎉');
}

// Edit profile handlers
function openEditProfile() {
    if (!appState.currentUser) return;

    elements.editName.value = appState.currentUser.name || '';
    elements.editBio.value = appState.currentUser.bio || '';
    elements.editPhone.value = appState.currentUser.phone || '';
    elements.editAge.value = appState.currentUser.age || '';
    elements.editSchool.value = appState.currentUser.school || '';
    elements.editGrade.value = appState.currentUser.grade || '';
    elements.editAvatarPreview.src = appState.currentUser.avatar || 'https://via.placeholder.com/100';

    elements.editProfileModal.classList.add('active');
}

function handleAvatarPreview(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            elements.editAvatarPreview.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
}

async function handleEditProfile(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', elements.editName.value);
    formData.append('bio', elements.editBio.value);
    formData.append('phone', elements.editPhone.value);
    formData.append('age', elements.editAge.value);
    formData.append('school', elements.editSchool.value);
    formData.append('grade', elements.editGrade.value);

    const avatarFile = elements.avatarUpload.files[0];
    if (avatarFile) {
        formData.append('avatar', avatarFile);
    }

    const result = await api.updateProfile(formData);

    if (!result.error) {
        appState.currentUser = { ...appState.currentUser, ...result };
        renderAll();
        elements.editProfileModal.classList.remove('active');
        showToast('Profile updated!');
    } else {
        showToast(result.error);
    }
}

// Messages (Real Groups)
async function sendMessage() {
    if (!appState.activeGroupId) return;

    const text = elements.messageInput.value.trim();
    if (!text) return;

    const result = await api.sendGroupMessage(appState.activeGroupId, text);
    if (result.error) {
        showToast(result.error);
        return;
    }

    elements.messageInput.value = '';
    await renderGroupMessages(appState.activeGroupId, false); // Refresh messages
}

let messagePollingInterval = null;

async function selectGroup(groupId) {
    appState.activeGroupId = groupId;
    const group = appState.groups.find(g => g.id == groupId);

    if (!group) return;

    // Update Header
    elements.chatHeader.querySelector('span').textContent = group.name;
    const headerImg = elements.chatHeader.querySelector('img');
    headerImg.style.display = 'block';
    headerImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=random`;

    // Highlight active group in list
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.toggle('active', item.dataset.groupId == groupId);
    });

    // Permission Check for Input
    if (group.type === "GLOBAL" && !appState.currentUser.is_admin) {
        elements.messageInput.placeholder = "Only admins can talk here";
        elements.messageInput.disabled = true;
        elements.sendMessage.disabled = true;
    } else {
        elements.messageInput.placeholder = "Message...";
        elements.messageInput.disabled = false;
        elements.sendMessage.disabled = false;
    }

    // Load messages
    await renderGroupMessages(groupId, true);

    // Setup Polling
    if (messagePollingInterval) clearInterval(messagePollingInterval);
    messagePollingInterval = setInterval(() => {
        if (appState.activeGroupId == groupId && document.getElementById('messages-view').classList.contains('active')) {
            renderGroupMessages(groupId, false);
        }
    }, 5000);
}

async function renderGroups() {
    if (!appState.isLoggedIn) return;

    const groups = await api.getGroups();
    appState.groups = groups;

    if (!groups || groups.length === 0) {
        elements.conversationsList.innerHTML = '<p style="padding: 20px; color: var(--text-secondary); text-align: center;">Initializing groups...</p>';
        return;
    }

    elements.conversationsList.innerHTML = groups.map(g => `
        <div class="conversation-item ${appState.activeGroupId == g.id ? 'active' : ''}" data-group-id="${g.id}">
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(g.name)}&background=random" alt="${g.name}">
            <div class="conversation-info">
                <span class="username">${g.name}</span>
                <span class="last-message">${g.memberCount} members</span>
            </div>
        </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', () => selectGroup(item.dataset.groupId));
    });
}

async function renderGroupMessages(groupId, shouldScroll = true) {
    const messages = await api.getGroupMessages(groupId);

    if (!messages) return;

    const messagesHtml = messages.map(msg => {
        const isMine = msg.user_id === appState.currentUser.id;
        return `
            <div class="message ${isMine ? 'sent' : 'received'}">
                ${!isMine ? `<span class="message-user">${msg.user.username}${msg.user.is_admin ? ' (Admin)' : ''}</span>` : ''}
                <div class="bubble">${msg.text}</div>
            </div>
        `;
    }).join('');

    elements.chatMessages.innerHTML = messagesHtml;

    if (shouldScroll) {
        elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    }
}

// Search
async function handleSearch(e) {
    const query = e.target.value.trim();
    const resultsContainer = document.getElementById('search-results');

    if (query.length < 1) {
        // Restore default categories if needed or just clear
        resultsContainer.innerHTML = '<p style="padding: 20px; color: #8e8e8e;">Enter a username to search...</p>';
        return;
    }

    const users = await api.searchUsers(query);

    if (!users || users.length === 0) {
        resultsContainer.innerHTML = '<p style="padding: 20px; color: #8e8e8e;">No users found.</p>';
        return;
    }

    resultsContainer.innerHTML = `
        <div class="search-users-list">
            ${users.map(u => `
                <div class="message-item" onclick="viewUserProfile('${u.username}')">
                    <img src="${u.avatar || 'https://via.placeholder.com/56'}" alt="${u.username}" style="width: 44px; height: 44px; border-radius: 50%;">
                    <div class="message-info">
                        <span class="username">${u.username}</span>
                        <span class="message-preview">${u.name || ''}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function viewUserProfile(username) {
    elements.searchInput.value = '';
    // This is a bit of a hack to change view, should use a proper router
    showView('profile');
    // We would need a separate function to fetch and render *any* profile, not just current user
    // For now, let's just toast
    showToast(`Redirecting to ${username}'s profile...`);
}

// ============================================
// INITIALIZATION
// ============================================

async function init() {
    // Check if user is logged in
    const isAuthenticated = await checkAuth();

    if (isAuthenticated) {
        showScreen('main-app');
        showView('home');
    } else {
        showScreen('auth-screen');
    }

    // Render all components
    if (isAuthenticated) {
        renderAll();
    }

    // Event listeners for auth
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.signupForm.addEventListener('submit', handleSignup);
    elements.showSignup.addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('signup-screen');
    });
    elements.showLogin.addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('auth-screen');
    });

    // Navigation
    elements.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.dataset.view;
            if (view) {
                if (view === 'admin') {
                    renderAdmin();
                }
                showView(view);
            }
        });
    });

    // Logout
    elements.logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    // Modal close
    elements.closeModal.addEventListener('click', closePostModal);
    elements.postModal.addEventListener('click', (e) => {
        if (e.target === elements.postModal) {
            closePostModal();
        }
    });

    // Edit profile modal
    elements.editProfile.addEventListener('click', openEditProfile);
    elements.editProfileForm.addEventListener('submit', handleEditProfile);
    elements.avatarUpload.addEventListener('change', handleAvatarPreview);
    document.querySelector('#edit-profile-modal .close-modal').addEventListener('click', () => {
        elements.editProfileModal.classList.remove('active');
    });
    elements.editProfileModal.addEventListener('click', (e) => {
        if (e.target === elements.editProfileModal) {
            elements.editProfileModal.classList.remove('active');
        }
    });

    // Create post
    elements.createDropzone.addEventListener('click', () => {
        elements.fileInput.click();
    });
    elements.fileInput.addEventListener('change', handleFileSelect);
    elements.removeImage.addEventListener('click', removeImage);

    // Create story
    if (elements.addStoryBtn) {
        elements.addStoryBtn.addEventListener('click', createNewStory);
    }

    // Load URL button
    const loadUrlBtn = document.getElementById('load-url-btn');
    if (loadUrlBtn) {
        loadUrlBtn.addEventListener('click', loadImageFromUrl);
    }

    elements.sharePost.addEventListener('click', shareNewPost);
    elements.cancelCreate.addEventListener('click', () => {
        removeImage();
        showView('home');
    });

    // Messages
    elements.sendMessage.addEventListener('click', sendMessage);
    elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Search
    elements.searchInput.addEventListener('input', handleSearch);

    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closePostModal();
            elements.editProfileModal.classList.remove('active');
        }
    });
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
