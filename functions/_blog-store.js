const POSTS_KEY = "posts";
const HIDDEN_KEY = "hidden-post-ids";

async function readStaticPosts(env, requestUrl) {
  const response = await env.ASSETS.fetch(new URL("/blog-posts.json", requestUrl));
  if (!response.ok) throw new Error("Static blog archive is unavailable");
  const posts = await response.json();
  return Array.isArray(posts) ? posts : [];
}

async function readStoredPosts(env) {
  const [overrides, hiddenIds] = await Promise.all([
    env.BLOG_POSTS.get(POSTS_KEY, "json"),
    env.BLOG_POSTS.get(HIDDEN_KEY, "json"),
  ]);
  return {
    overrides: Array.isArray(overrides) ? overrides : [],
    hiddenIds: Array.isArray(hiddenIds) ? hiddenIds : [],
  };
}

function mergePosts(overrides, archive, hiddenIds) {
  const hidden = new Set(hiddenIds);
  const seen = new Set();
  return [...overrides, ...archive].filter((post) => {
    if (!post?.id || hidden.has(post.id) || seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });
}

export async function readBlogData(env, requestUrl) {
  const [archive, stored] = await Promise.all([
    readStaticPosts(env, requestUrl),
    readStoredPosts(env),
  ]);
  return {
    ...stored,
    archive,
    posts: mergePosts(stored.overrides, archive, stored.hiddenIds),
  };
}

export async function upsertBlogPost(env, requestUrl, post) {
  const data = await readBlogData(env, requestUrl);
  const overrides = data.overrides.filter((entry) => entry.id !== post.id);
  overrides.unshift(post);
  const hiddenIds = data.hiddenIds.filter((id) => id !== post.id);
  await Promise.all([
    env.BLOG_POSTS.put(POSTS_KEY, JSON.stringify(overrides.slice(0, 100))),
    hiddenIds.length === data.hiddenIds.length
      ? Promise.resolve()
      : env.BLOG_POSTS.put(HIDDEN_KEY, JSON.stringify(hiddenIds)),
  ]);
  return mergePosts(overrides, data.archive, hiddenIds);
}

export async function deleteBlogPost(env, requestUrl, id) {
  const data = await readBlogData(env, requestUrl);
  const overrides = data.overrides.filter((entry) => entry.id !== id);
  const hiddenIds = data.archive.some((entry) => entry.id === id)
    ? [...new Set([...data.hiddenIds, id])]
    : data.hiddenIds;
  await Promise.all([
    env.BLOG_POSTS.put(POSTS_KEY, JSON.stringify(overrides)),
    hiddenIds.length === data.hiddenIds.length
      ? Promise.resolve()
      : env.BLOG_POSTS.put(HIDDEN_KEY, JSON.stringify(hiddenIds)),
  ]);
  return mergePosts(overrides, data.archive, hiddenIds);
}
