CREATE TABLE IF NOT EXISTS gallery_items (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  title TEXT,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  like_count INTEGER NOT NULL DEFAULT 0,
  remix_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES generation_tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gallery_items_visibility_created_at
  ON gallery_items (visibility, created_at);

CREATE INDEX IF NOT EXISTS idx_gallery_items_visibility_like_count
  ON gallery_items (visibility, like_count);

CREATE TABLE IF NOT EXISTS gallery_likes (
  gallery_item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (gallery_item_id, user_id),
  FOREIGN KEY (gallery_item_id) REFERENCES gallery_items(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gallery_likes_user_id
  ON gallery_likes (user_id);
