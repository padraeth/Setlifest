CREATE TABLE IF NOT EXISTS goal_reviews (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  goal_id CHAR(36) NOT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_goal_reviews_owner_id (user_id, id),
  KEY idx_goal_reviews_goal (user_id, goal_id, created_at),
  CONSTRAINT fk_goal_reviews_user FOREIGN KEY (user_id) REFERENCES workspace_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_goal_reviews_goal FOREIGN KEY (user_id, goal_id) REFERENCES goals(user_id, id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
