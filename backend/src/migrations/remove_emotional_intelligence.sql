-- 移除情感智能系统相关数据库表和索引

-- 删除索引
DROP INDEX IF EXISTS idx_emotional_memories_user_timestamp;
DROP INDEX IF EXISTS idx_user_preferences_user_category;
DROP INDEX IF EXISTS idx_emotional_state_user_timestamp;
DROP INDEX IF EXISTS idx_emotion_cache_hash;

-- 删除表
DROP TABLE IF EXISTS emotion_analysis_cache;
DROP TABLE IF EXISTS personalized_response_templates;
DROP TABLE IF EXISTS emotional_state_history;
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS emotional_memories;
DROP TABLE IF EXISTS user_emotional_profile;
