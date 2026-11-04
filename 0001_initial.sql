CREATE TABLE IF NOT EXISTS workspace_users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  open_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(320) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_workspace_users_open_id (open_id),
  UNIQUE KEY uq_workspace_users_id (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS workspace_sessions (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  csrf_token CHAR(64) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_workspace_sessions_user (user_id),
  KEY idx_workspace_sessions_expiry (expires_at),
  CONSTRAINT fk_workspace_sessions_user FOREIGN KEY (user_id) REFERENCES workspace_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS habits (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_habits_owner_id (user_id, id),
  KEY idx_habits_owner (user_id),
  CONSTRAINT fk_habits_user FOREIGN KEY (user_id) REFERENCES workspace_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS habit_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  habit_id CHAR(36) NOT NULL,
  log_date DATE NOT NULL,
  kind VARCHAR(20) NOT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_habit_logs_owner_id (user_id, id),
  KEY idx_habit_logs_owner_date (user_id, log_date),
  KEY idx_habit_logs_habit_date (user_id, habit_id, log_date),
  CONSTRAINT fk_habit_logs_user FOREIGN KEY (user_id) REFERENCES workspace_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_habit_logs_habit FOREIGN KEY (user_id, habit_id) REFERENCES habits(user_id, id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS goals (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  parent_goal_id CHAR(36) NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_goals_owner_id (user_id, id),
  KEY idx_goals_owner (user_id),
  KEY idx_goals_parent (user_id, parent_goal_id),
  CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES workspace_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_goals_parent FOREIGN KEY (user_id, parent_goal_id) REFERENCES goals(user_id, id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tasks (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  goal_id CHAR(36) NULL,
  due_date DATE NULL,
  status VARCHAR(20) NOT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tasks_owner_id (user_id, id),
  KEY idx_tasks_owner_status_due (user_id, status, due_date),
  CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES workspace_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_goal FOREIGN KEY (user_id, goal_id) REFERENCES goals(user_id, id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS task_subtasks (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  task_id CHAR(36) NOT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_task_subtasks_owner_id (user_id, id),
  KEY idx_task_subtasks_task (user_id, task_id),
  CONSTRAINT fk_task_subtasks_user FOREIGN KEY (user_id) REFERENCES workspace_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_subtasks_task FOREIGN KEY (user_id, task_id) REFERENCES tasks(user_id, id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS goal_milestones (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  goal_id CHAR(36) NOT NULL,
  due_date DATE NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_goal_milestones_owner_id (user_id, id),
  KEY idx_goal_milestones_goal (user_id, goal_id, due_date),
  CONSTRAINT fk_goal_milestones_user FOREIGN KEY (user_id) REFERENCES workspace_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_goal_milestones_goal FOREIGN KEY (user_id, goal_id) REFERENCES goals(user_id, id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roadmaps (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_roadmaps_owner_id (user_id, id),
  KEY idx_roadmaps_owner (user_id),
  CONSTRAINT fk_roadmaps_user FOREIGN KEY (user_id) REFERENCES workspace_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roadmap_nodes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  roadmap_id CHAR(36) NOT NULL,
  parent_id CHAR(36) NULL,
  goal_id CHAR(36) NULL,
  task_id CHAR(36) NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_roadmap_nodes_owner_id (user_id, id),
  KEY idx_roadmap_nodes_roadmap (user_id, roadmap_id),
  KEY idx_roadmap_nodes_parent (user_id, parent_id),
  CONSTRAINT fk_roadmap_nodes_user FOREIGN KEY (user_id) REFERENCES workspace_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_roadmap_nodes_roadmap FOREIGN KEY (user_id, roadmap_id) REFERENCES roadmaps(user_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_roadmap_nodes_parent FOREIGN KEY (user_id, parent_id) REFERENCES roadmap_nodes(user_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_roadmap_nodes_goal FOREIGN KEY (user_id, goal_id) REFERENCES goals(user_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_roadmap_nodes_task FOREIGN KEY (user_id, task_id) REFERENCES tasks(user_id, id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roadmap_edges (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  roadmap_id CHAR(36) NOT NULL,
  source_id CHAR(36) NOT NULL,
  target_id CHAR(36) NOT NULL,
  edge_kind VARCHAR(20) NOT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_roadmap_edges_owner_id (user_id, id),
  KEY idx_roadmap_edges_roadmap (user_id, roadmap_id),
  CONSTRAINT fk_roadmap_edges_user FOREIGN KEY (user_id) REFERENCES workspace_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_roadmap_edges_roadmap FOREIGN KEY (user_id, roadmap_id) REFERENCES roadmaps(user_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_roadmap_edges_source FOREIGN KEY (user_id, source_id) REFERENCES roadmap_nodes(user_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_roadmap_edges_target FOREIGN KEY (user_id, target_id) REFERENCES roadmap_nodes(user_id, id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS courses (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  goal_id CHAR(36) NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_courses_owner_id (user_id, id),
  KEY idx_courses_owner (user_id),
  CONSTRAINT fk_courses_user FOREIGN KEY (user_id) REFERENCES workspace_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_courses_goal FOREIGN KEY (user_id, goal_id) REFERENCES goals(user_id, id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS course_sections (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  course_id CHAR(36) NOT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_course_sections_owner_id (user_id, id),
  KEY idx_course_sections_course (user_id, course_id),
  CONSTRAINT fk_course_sections_user FOREIGN KEY (user_id) REFERENCES workspace_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_course_sections_course FOREIGN KEY (user_id, course_id) REFERENCES courses(user_id, id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lessons (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  section_id CHAR(36) NOT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lessons_owner_id (user_id, id),
  KEY idx_lessons_section (user_id, section_id),
  CONSTRAINT fk_lessons_user FOREIGN KEY (user_id) REFERENCES workspace_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_lessons_section FOREIGN KEY (user_id, section_id) REFERENCES course_sections(user_id, id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lesson_progress (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  lesson_id CHAR(36) NOT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lesson_progress_owner_id (user_id, id),
  KEY idx_lesson_progress_lesson (user_id, lesson_id),
  CONSTRAINT fk_lesson_progress_user FOREIGN KEY (user_id) REFERENCES workspace_users(id) ON DELETE CASCADE,
  CONSTRAINT fk_lesson_progress_lesson FOREIGN KEY (user_id, lesson_id) REFERENCES lessons(user_id, id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id CHAR(36) NOT NULL,
  payload JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_notes_owner_id (user_id, id),
  KEY idx_notes_entity (user_id, entity_type, entity_id),
  CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES workspace_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_preferences (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  payload JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_preferences_owner (user_id),
  CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES workspace_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(100) NOT NULL PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
