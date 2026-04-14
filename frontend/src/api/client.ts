const BASE_URL = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail ?? `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// --- Items ---

export interface Item {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ItemCreate {
  name: string;
  description?: string;
}

export const itemsApi = {
  list: () => request<Item[]>("/items/"),
  create: (data: ItemCreate) =>
    request<Item>("/items/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  delete: (id: number) => request<void>(`/items/${id}`, { method: "DELETE" }),
};

// --- Auth ---

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  profile_image: string | null;
  is_admin: boolean;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export const authApi = {
  register: (data: FormData) =>
    request<User>("/auth/register", { method: "POST", body: data }),

  login: (email: string, password: string) => {
    const form = new FormData();
    form.append("email", email);
    form.append("password", password);
    return request<User>("/auth/login", { method: "POST", body: form });
  },

  logout: () => request<void>("/auth/logout", { method: "POST" }),

  me: () => request<User>("/auth/me"),
};

// --- Profile ---

export const profileApi = {
  update: (data: FormData) =>
    request<User>("/profile", { method: "PATCH", body: data }),
};

// --- Wishlist ---

export interface SuggestedBy {
  id: number;
  first_name: string;
  last_name: string;
}

export type WishCategory = "confessions" | "gage" | "defis" | "autre";

export const WISH_CATEGORIES: { value: WishCategory; label: string; color: string; bg: string }[] = [
  { value: "confessions", label: "Confessions", color: "#7c3aed", bg: "#f5f3ff" },
  { value: "gage",        label: "Gage",        color: "#b45309", bg: "#fffbeb" },
  { value: "defis",       label: "Défis",       color: "#0369a1", bg: "#eff6ff" },
  { value: "autre",       label: "Autre",       color: "#374151", bg: "#f9fafb" },
];

export interface WishItem {
  id: number;
  user_id: number;
  child_id: number | null;
  name: string;
  description: string | null;
  url: string | null;
  image: string | null;
  category: WishCategory | null;
  suggested_by: SuggestedBy | null;
  hidden_from_ids: number[];
  created_at: string;
}

export interface Child {
  id: number;
  parent_user_id: number;
  second_parent_user_id: number | null;
  second_parent: { id: number; first_name: string; last_name: string; profile_image: string | null } | null;
  first_name: string;
  last_name: string;
  profile_image: string | null;
  created_at: string;
}

export const wishlistApi = {
  list: () => request<WishItem[]>("/wishlist"),

  create: (data: FormData) =>
    request<WishItem>("/wishlist", { method: "POST", body: data }),

  update: (id: number, data: FormData) =>
    request<WishItem>(`/wishlist/${id}`, { method: "PATCH", body: data }),

  delete: (id: number) =>
    request<void>(`/wishlist/${id}`, { method: "DELETE" }),

  acceptSuggestion: (id: number) =>
    request<WishItem>(`/wishlist/suggestions/${id}/accept`, { method: "POST" }),

  rejectSuggestion: (id: number) =>
    request<void>(`/wishlist/suggestions/${id}`, { method: "DELETE" }),

  hideFrom: (itemId: number, userId: number) =>
    request<WishItem>(`/wishlist/${itemId}/hide/${userId}`, { method: "POST" }),

  unhideFrom: (itemId: number, userId: number) =>
    request<WishItem>(`/wishlist/${itemId}/hide/${userId}`, { method: "DELETE" }),
};

// --- Admin ---

export const adminApi = {
  listUsers: (status: "pending" | "approved" | "rejected" | "all" = "pending") =>
    request<User[]>(`/admin/users?status=${status}`),

  approve: (id: number) =>
    request<User>(`/admin/users/${id}/approve`, { method: "PATCH" }),

  reject: (id: number) =>
    request<User>(`/admin/users/${id}/reject`, { method: "PATCH" }),

  toggleAdmin: (id: number) =>
    request<User>(`/admin/users/${id}/toggle-admin`, { method: "PATCH" }),

  invite: (email: string, name: string) => {
    const form = new FormData();
    form.append("email", email);
    form.append("name", name);
    return request<{ message: string }>("/admin/invite", { method: "POST", body: form });
  },

  resetPassword: (id: number, password: string) => {
    const form = new FormData();
    form.append("password", password);
    return request<User>(`/admin/users/${id}/password`, { method: "PATCH", body: form });
  },
};

// --- Secret Santa ---

export interface SantaUserInfo {
  id: number;
  first_name: string;
  last_name: string;
  nickname: string | null;
  profile_image: string | null;
}

export interface SantaParticipant {
  id: number;
  user: SantaUserInfo;
  assigned_to: SantaUserInfo | null;
  assigned_to_wishlist: WishItem[] | null;
}

export interface SantaExclusion {
  id: number;
  user: SantaUserInfo;
  excluded_user: SantaUserInfo;
}

export interface SecretSanta {
  id: number;
  name: string;
  description: string | null;
  status: "draft" | "drawn";
  participant_count: number;
  based_on_id: number | null;
  based_on_name: string | null;
  created_at: string;
}

export interface SecretSantaDetail {
  id: number;
  name: string;
  description: string | null;
  status: "draft" | "drawn";
  participants: SantaParticipant[];
  exclusions: SantaExclusion[];
  based_on_id: number | null;
  based_on_name: string | null;
  created_at: string;
}

export interface MyAssignment {
  santa_id: number;
  santa_name: string;
  assigned_to: SantaUserInfo;
  wishlist: WishItem[];
}

export const santaAdminApi = {
  list: () => request<SecretSanta[]>("/admin/santas"),

  create: (name: string, description?: string) => {
    const params = new URLSearchParams({ name });
    if (description) params.append("description", description);
    return request<SecretSanta>(`/admin/santas?${params}`, { method: "POST" });
  },

  get: (id: number) => request<SecretSantaDetail>(`/admin/santas/${id}`),

  delete: (id: number) => request<void>(`/admin/santas/${id}`, { method: "DELETE" }),

  addParticipant: (santaId: number, userId: number) =>
    request<SecretSantaDetail>(`/admin/santas/${santaId}/participants?user_id=${userId}`, { method: "POST" }),

  removeParticipant: (santaId: number, userId: number) =>
    request<SecretSantaDetail>(`/admin/santas/${santaId}/participants/${userId}`, { method: "DELETE" }),

  addExclusion: (santaId: number, userId: number, excludedUserId: number) =>
    request<SecretSantaDetail>(
      `/admin/santas/${santaId}/exclusions?user_id=${userId}&excluded_user_id=${excludedUserId}`,
      { method: "POST" },
    ),

  removeExclusion: (santaId: number, exclusionId: number) =>
    request<SecretSantaDetail>(`/admin/santas/${santaId}/exclusions/${exclusionId}`, { method: "DELETE" }),

  draw: (santaId: number) =>
    request<SecretSantaDetail>(`/admin/santas/${santaId}/draw`, { method: "POST" }),

  clone: (santaId: number) =>
    request<SecretSantaDetail>(`/admin/santas/${santaId}/clone`, { method: "POST" }),
};

export const santaUserApi = {
  mine: () => request<MyAssignment[]>("/santas/mine"),
};

// --- Users & Reservations ---

export interface ReservedBy {
  id: number;
  first_name: string;
  last_name: string;
}

export interface PublicWishItem {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  url: string | null;
  image: string | null;
  created_at: string;
  reserved_by: ReservedBy | null;
  suggested_by: SuggestedBy | null;
}

// --- Mes réservations ---

export interface MyReservation {
  id: number;
  purchased: boolean;
  wish_item_id: number;
  wish_item_name: string;
  wish_item_description: string | null;
  wish_item_url: string | null;
  wish_item_image: string | null;
  owner_id: number;
  owner_first_name: string;
  owner_last_name: string;
  owner_profile_image: string | null;
  created_at: string;
}

export const reservationsApi = {
  mine: () => request<MyReservation[]>("/reservations/mine"),
  togglePurchased: (id: number) =>
    request<MyReservation>(`/reservations/${id}/purchased`, { method: "PATCH" }),
};

export const usersApi = {
  list: () => request<User[]>("/users"),

  getWishlist: (userId: number) =>
    request<PublicWishItem[]>(`/users/${userId}/wishlist`),

  reserve: (userId: number, itemId: number) =>
    request<PublicWishItem>(`/users/${userId}/wishlist/${itemId}/reserve`, { method: "POST" }),

  unreserve: (userId: number, itemId: number) =>
    request<PublicWishItem>(`/users/${userId}/wishlist/${itemId}/reserve`, { method: "DELETE" }),

  suggest: (userId: number, data: FormData) =>
    request<PublicWishItem>(`/users/${userId}/wishlist/suggest`, { method: "POST", body: data }),

  getChildren: (userId: number) =>
    request<Child[]>(`/users/${userId}/children`),

  getChildWishlist: (userId: number, childId: number) =>
    request<PublicWishItem[]>(`/users/${userId}/children/${childId}/wishlist`),

  suggestForChild: (userId: number, childId: number, data: FormData) =>
    request<PublicWishItem>(`/users/${userId}/children/${childId}/wishlist/suggest`, { method: "POST", body: data }),
};

// --- Children ---

export const childrenApi = {
  list: () => request<Child[]>("/children"),

  create: (data: FormData) =>
    request<Child>("/children", { method: "POST", body: data }),

  update: (id: number, data: FormData) =>
    request<Child>(`/children/${id}`, { method: "PATCH", body: data }),

  delete: (id: number) =>
    request<void>(`/children/${id}`, { method: "DELETE" }),

  getWishlist: (childId: number) =>
    request<WishItem[]>(`/children/${childId}/wishlist`),

  addWishItem: (childId: number, data: FormData) =>
    request<WishItem>(`/children/${childId}/wishlist`, { method: "POST", body: data }),

  updateWishItem: (childId: number, itemId: number, data: FormData) =>
    request<WishItem>(`/children/${childId}/wishlist/${itemId}`, { method: "PATCH", body: data }),

  deleteWishItem: (childId: number, itemId: number) =>
    request<void>(`/children/${childId}/wishlist/${itemId}`, { method: "DELETE" }),

  acceptSuggestion: (childId: number, itemId: number) =>
    request<WishItem>(`/children/${childId}/wishlist/${itemId}/accept-suggestion`, { method: "POST" }),

  rejectSuggestion: (childId: number, itemId: number) =>
    request<void>(`/children/${childId}/wishlist/${itemId}/reject-suggestion`, { method: "DELETE" }),

  setSecondParent: (childId: number, userId: number) => {
    const form = new FormData();
    form.append("user_id", String(userId));
    return request<Child>(`/children/${childId}/second-parent`, { method: "PUT", body: form });
  },

  removeSecondParent: (childId: number) =>
    request<Child>(`/children/${childId}/second-parent`, { method: "DELETE" }),
};
