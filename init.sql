-- ============================================================
-- hanphone-chat 数据库结构（chat_db，PostgreSQL）
-- ⚠️ 本文件是 chat_db schema 的唯一事实来源：改表结构后必须同步更新本文件。
-- 新建库：psql -h 127.0.0.1 -U chat_db -d chat_db -f init.sql
-- 幂等：可重复执行，不会破坏已存在的数据。
-- ============================================================

-- 自动更新 updated_at 触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$;

-- ---------- conversations ----------
CREATE TABLE IF NOT EXISTS conversations (
    id integer NOT NULL PRIMARY KEY,
    conversation_id character varying NOT NULL,
    user_id character varying NOT NULL,
    title character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone,
    skill_id character varying(255) DEFAULT NULL::character varying
);
CREATE SEQUENCE IF NOT EXISTS conversations_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE conversations_id_seq OWNED BY conversations.id;
ALTER TABLE ONLY conversations ALTER COLUMN id SET DEFAULT nextval('conversations_id_seq'::regclass);
CREATE UNIQUE INDEX IF NOT EXISTS ix_conversations_conversation_id ON conversations (conversation_id);
CREATE INDEX IF NOT EXISTS ix_conversations_user_id ON conversations (user_id);

-- ---------- messages（私信/会话消息）
-- conversation_id 形如 conv_{sender}_{receiver}；role=user 时发送方为前段、role=assistant 时发送方为后段
CREATE TABLE IF NOT EXISTS messages (
    id integer NOT NULL PRIMARY KEY,
    conversation_id character varying NOT NULL,
    role character varying NOT NULL,
    content text NOT NULL,
    "timestamp" timestamp without time zone,
    is_read boolean DEFAULT false NOT NULL
);
CREATE SEQUENCE IF NOT EXISTS messages_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE messages_id_seq OWNED BY messages.id;
ALTER TABLE ONLY messages ALTER COLUMN id SET DEFAULT nextval('messages_id_seq'::regclass);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (conversation_id, "timestamp");

-- ---------- public_room_messages（公共聊天室） ----------
CREATE TABLE IF NOT EXISTS public_room_messages (
    id integer NOT NULL PRIMARY KEY,
    user_id integer,
    nickname character varying(64) NOT NULL,
    avatar character varying(256),
    content text NOT NULL,
    from_ai boolean DEFAULT false,
    "timestamp" timestamp with time zone DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS public_room_messages_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public_room_messages_id_seq OWNED BY public_room_messages.id;
ALTER TABLE ONLY public_room_messages ALTER COLUMN id SET DEFAULT nextval('public_room_messages_id_seq'::regclass);
CREATE INDEX IF NOT EXISTS idx_public_messages_timestamp ON public_room_messages ("timestamp" DESC);

-- ---------- core_memories（agent L4 核心记忆） ----------
CREATE TABLE IF NOT EXISTS core_memories (
    id integer NOT NULL PRIMARY KEY,
    user_id character varying NOT NULL,
    key character varying NOT NULL,
    value text NOT NULL,
    memory_type character varying NOT NULL,
    importance integer DEFAULT 4,
    confidence integer DEFAULT 100,
    metadata text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
CREATE SEQUENCE IF NOT EXISTS core_memories_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE core_memories_id_seq OWNED BY core_memories.id;
ALTER TABLE ONLY core_memories ALTER COLUMN id SET DEFAULT nextval('core_memories_id_seq'::regclass);
CREATE INDEX IF NOT EXISTS ix_core_memories_user_id ON core_memories (user_id);

-- ---------- long_term_memories（agent L3 长期记忆） ----------
CREATE TABLE IF NOT EXISTS long_term_memories (
    id integer NOT NULL PRIMARY KEY,
    memory_id character varying NOT NULL,
    conversation_id character varying NOT NULL,
    content text NOT NULL,
    memory_type character varying NOT NULL,
    importance integer,
    created_at timestamp without time zone,
    vector_id character varying
);
CREATE SEQUENCE IF NOT EXISTS long_term_memories_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE long_term_memories_id_seq OWNED BY long_term_memories.id;
ALTER TABLE ONLY long_term_memories ALTER COLUMN id SET DEFAULT nextval('long_term_memories_id_seq'::regclass);
CREATE UNIQUE INDEX IF NOT EXISTS ix_long_term_memories_memory_id ON long_term_memories (memory_id);

-- 外键（存在即跳过）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_conversation_id_fkey') THEN
        ALTER TABLE messages ADD CONSTRAINT messages_conversation_id_fkey
            FOREIGN KEY (conversation_id) REFERENCES conversations (conversation_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'long_term_memories_conversation_id_fkey') THEN
        ALTER TABLE long_term_memories ADD CONSTRAINT long_term_memories_conversation_id_fkey
            FOREIGN KEY (conversation_id) REFERENCES conversations (conversation_id);
    END IF;
END $$;