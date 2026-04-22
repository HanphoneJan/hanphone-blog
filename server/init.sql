--
-- PostgreSQL database cluster dump
--

-- Started on 2026-04-22 17:03:42

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE atlas;
ALTER ROLE atlas WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS;
CREATE ROLE blog;
ALTER ROLE blog WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS;
CREATE ROLE chat_db;
ALTER ROLE chat_db WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS;
CREATE ROLE interview;
ALTER ROLE interview WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB LOGIN NOREPLICATION NOBYPASSRLS;
CREATE ROLE postgres;
ALTER ROLE postgres WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS;

--
-- User Configurations
--








--
-- Databases
--

--
-- Database "template1" dump
--

\connect template1

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.0

-- Started on 2026-04-22 17:03:42

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Completed on 2026-04-22 17:03:43

--
-- PostgreSQL database dump complete
--

--
-- Database "blog" dump
--

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.0

-- Started on 2026-04-22 17:03:43

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 3653 (class 1262 OID 16388)
-- Name: blog; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE blog WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.UTF-8';


ALTER DATABASE blog OWNER TO postgres;

\connect blog

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 265 (class 1255 OID 16391)
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_modified_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 217 (class 1259 OID 16392)
-- Name: atlas_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.atlas_files (
    id bigint NOT NULL,
    path character varying(128) NOT NULL,
    author character varying(64) NOT NULL,
    description character varying(512) NOT NULL,
    title character varying(24) NOT NULL,
    upload_time character varying(24) NOT NULL,
    likes integer DEFAULT 0 NOT NULL,
    type integer DEFAULT 0 NOT NULL,
    user_id bigint
);


ALTER TABLE public.atlas_files OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 16399)
-- Name: atlas_files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.atlas_files ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.atlas_files_id_seq
    START WITH 10
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 219 (class 1259 OID 16400)
-- Name: atlas_files_tag; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.atlas_files_tag (
    files_id bigint NOT NULL,
    tag_id integer NOT NULL
);


ALTER TABLE public.atlas_files_tag OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16403)
-- Name: atlas_tag; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.atlas_tag (
    id integer NOT NULL,
    name character varying(128)
);


ALTER TABLE public.atlas_tag OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16406)
-- Name: atlas_tag_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.atlas_tag_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.atlas_tag_id_seq OWNER TO postgres;

--
-- TOC entry 3656 (class 0 OID 0)
-- Dependencies: 221
-- Name: atlas_tag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.atlas_tag_id_seq OWNED BY public.atlas_tag.id;


--
-- TOC entry 222 (class 1259 OID 16407)
-- Name: atlas_type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.atlas_type (
    type integer NOT NULL,
    name character varying(128)
);


ALTER TABLE public.atlas_type OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16410)
-- Name: atlas_visitcounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.atlas_visitcounts (
    id integer NOT NULL,
    visit_count integer DEFAULT 0 NOT NULL,
    last_visit timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.atlas_visitcounts OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16415)
-- Name: atlas_visitcounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.atlas_visitcounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.atlas_visitcounts_id_seq OWNER TO postgres;

--
-- TOC entry 3657 (class 0 OID 0)
-- Dependencies: 224
-- Name: atlas_visitcounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.atlas_visitcounts_id_seq OWNED BY public.atlas_visitcounts.id;


--
-- TOC entry 225 (class 1259 OID 16416)
-- Name: blog_monthly_visits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blog_monthly_visits (
    id bigint NOT NULL,
    year_month character varying(6) NOT NULL,
    total_visits bigint DEFAULT 0 NOT NULL,
    record_update_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.blog_monthly_visits OWNER TO postgres;

--
-- TOC entry 3658 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE blog_monthly_visits; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.blog_monthly_visits IS '存储博客网站的月度访问量数据';


--
-- TOC entry 3659 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN blog_monthly_visits.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.blog_monthly_visits.id IS '记录唯一标识';


--
-- TOC entry 3660 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN blog_monthly_visits.year_month; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.blog_monthly_visits.year_month IS '年月标识（格式：YYYYMM）';


--
-- TOC entry 3661 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN blog_monthly_visits.total_visits; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.blog_monthly_visits.total_visits IS '当月网站总访问量';


--
-- TOC entry 3662 (class 0 OID 0)
-- Dependencies: 225
-- Name: COLUMN blog_monthly_visits.record_update_time; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.blog_monthly_visits.record_update_time IS '记录最后更新时间（带时区）';


--
-- TOC entry 226 (class 1259 OID 16421)
-- Name: blog_monthly_visits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.blog_monthly_visits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.blog_monthly_visits_id_seq OWNER TO postgres;

--
-- TOC entry 3663 (class 0 OID 0)
-- Dependencies: 226
-- Name: blog_monthly_visits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.blog_monthly_visits_id_seq OWNED BY public.blog_monthly_visits.id;


--
-- TOC entry 227 (class 1259 OID 16422)
-- Name: friend_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.friend_links (
    id bigint NOT NULL,
    name character varying(255) NOT NULL,
    url character varying(500) NOT NULL,
    link_url character varying(500),
    avatar character varying(500),
    recommend boolean DEFAULT false,
    create_time timestamp without time zone,
    description text,
    color character varying(20) DEFAULT '#1890ff'::character varying,
    type character varying(255) DEFAULT USER,
    siteshot character varying(500),
    rss character varying(500),
    nickname character varying(100),
    published boolean DEFAULT false,
    apply_text text
);


ALTER TABLE public.friend_links OWNER TO postgres;

--
-- TOC entry 3664 (class 0 OID 0)
-- Dependencies: 227
-- Name: TABLE friend_links; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.friend_links IS '友情链接表';


--
-- TOC entry 3665 (class 0 OID 0)
-- Dependencies: 227
-- Name: COLUMN friend_links.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.friend_links.name IS '友链名称';


--
-- TOC entry 3666 (class 0 OID 0)
-- Dependencies: 227
-- Name: COLUMN friend_links.url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.friend_links.url IS '友链URL';


--
-- TOC entry 3667 (class 0 OID 0)
-- Dependencies: 227
-- Name: COLUMN friend_links.link_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.friend_links.link_url IS '链接URL';


--
-- TOC entry 3668 (class 0 OID 0)
-- Dependencies: 227
-- Name: COLUMN friend_links.avatar; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.friend_links.avatar IS '头像图片URL';


--
-- TOC entry 3669 (class 0 OID 0)
-- Dependencies: 227
-- Name: COLUMN friend_links.recommend; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.friend_links.recommend IS '是否推荐';


--
-- TOC entry 3670 (class 0 OID 0)
-- Dependencies: 227
-- Name: COLUMN friend_links.create_time; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.friend_links.create_time IS '创建时间';


--
-- TOC entry 3671 (class 0 OID 0)
-- Dependencies: 227
-- Name: COLUMN friend_links.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.friend_links.description IS '友链描述';


--
-- TOC entry 3672 (class 0 OID 0)
-- Dependencies: 227
-- Name: COLUMN friend_links.color; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.friend_links.color IS '主题颜色';


--
-- TOC entry 228 (class 1259 OID 16430)
-- Name: friend_links_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.friend_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.friend_links_id_seq OWNER TO postgres;

--
-- TOC entry 3673 (class 0 OID 0)
-- Dependencies: 228
-- Name: friend_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.friend_links_id_seq OWNED BY public.friend_links.id;


--
-- TOC entry 259 (class 1259 OID 42793)
-- Name: friend_links_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.friend_links_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.friend_links_seq OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16431)
-- Name: hibernate_sequence; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.hibernate_sequence
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.hibernate_sequence OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16432)
-- Name: personal_info; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.personal_info (
    id bigint NOT NULL,
    category character varying(20) NOT NULL,
    name character varying(100),
    description text,
    url character varying(1024),
    pic_url character varying(1024),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    icon_src character varying(255),
    rank bigint,
    CONSTRAINT personal_info_category_check CHECK (((category)::text = ANY (ARRAY[('skill'::character varying)::text, ('work'::character varying)::text, ('hobby'::character varying)::text, ('evaluation'::character varying)::text])))
);


ALTER TABLE public.personal_info OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16440)
-- Name: personal_info_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.personal_info_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.personal_info_id_seq OWNER TO postgres;

--
-- TOC entry 3674 (class 0 OID 0)
-- Dependencies: 231
-- Name: personal_info_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.personal_info_id_seq OWNED BY public.personal_info.id;


--
-- TOC entry 260 (class 1259 OID 42794)
-- Name: personal_info_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.personal_info_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.personal_info_seq OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 16441)
-- Name: private_message; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.private_message (
    id integer NOT NULL,
    sender_id integer NOT NULL,
    receiver_id integer NOT NULL,
    content text NOT NULL,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_read boolean DEFAULT false,
    from_ai boolean DEFAULT false,
    to_ai boolean DEFAULT false
);


ALTER TABLE public.private_message OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16450)
-- Name: private_message_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.private_message ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.private_message_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 234 (class 1259 OID 16451)
-- Name: t_blog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.t_blog (
    id bigint NOT NULL,
    appreciation integer,
    commentabled boolean NOT NULL,
    content text,
    create_time timestamp(6) without time zone DEFAULT NULL::timestamp without time zone,
    description character varying(255) DEFAULT NULL::character varying,
    first_picture character varying(255) DEFAULT NULL::character varying,
    flag character varying(255) DEFAULT NULL::character varying,
    published boolean,
    recommend boolean,
    share_statement boolean,
    title character varying(255) DEFAULT NULL::character varying,
    update_time timestamp(6) without time zone DEFAULT NULL::timestamp without time zone,
    views integer,
    type_id bigint,
    user_id bigint,
    likes integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.t_blog OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 42795)
-- Name: t_blog_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.t_blog_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_blog_seq OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16463)
-- Name: t_blog_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.t_blog_tags (
    blogs_id bigint NOT NULL,
    tags_id bigint NOT NULL
);


ALTER TABLE public.t_blog_tags OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 16466)
-- Name: t_comment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.t_comment (
    user_id bigint,
    id bigint NOT NULL,
    avatar character varying(255) DEFAULT NULL::character varying,
    create_time timestamp(6) without time zone DEFAULT NULL::timestamp without time zone,
    email character varying(255) DEFAULT NULL::character varying,
    nickname character varying(255) DEFAULT NULL::character varying,
    blog_id bigint,
    parent_comment_id bigint,
    admin_comment boolean NOT NULL,
    content character varying(255) DEFAULT NULL::character varying
);


ALTER TABLE public.t_comment OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16476)
-- Name: t_comment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.t_comment ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.t_comment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 257 (class 1259 OID 42647)
-- Name: t_doc; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.t_doc (
    id bigint NOT NULL,
    doc_id character varying(64) NOT NULL,
    title character varying(255) NOT NULL,
    description character varying(512),
    filename character varying(512) NOT NULL,
    file_type character varying(20) NOT NULL,
    doc_namespace character varying(64) DEFAULT 'blog/docs'::character varying,
    view_count bigint DEFAULT 0,
    recommend boolean DEFAULT false,
    create_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    update_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    published boolean DEFAULT false NOT NULL
);


ALTER TABLE public.t_doc OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 42657)
-- Name: t_doc_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.t_doc_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_doc_id_seq OWNER TO postgres;

--
-- TOC entry 3675 (class 0 OID 0)
-- Dependencies: 258
-- Name: t_doc_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.t_doc_id_seq OWNED BY public.t_doc.id;


--
-- TOC entry 238 (class 1259 OID 16477)
-- Name: t_essay_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.t_essay_id_seq
    START WITH 1064
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_essay_id_seq OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16478)
-- Name: t_essay; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.t_essay (
    id bigint DEFAULT nextval('public.t_essay_id_seq'::regclass) NOT NULL,
    title character varying(255) DEFAULT NULL::character varying,
    content text,
    image character varying(255) DEFAULT NULL::character varying,
    create_time timestamp without time zone,
    praise bigint DEFAULT 0,
    likes integer DEFAULT 0 NOT NULL,
    user_id bigint,
    recommend boolean DEFAULT false,
    published boolean DEFAULT false
);


ALTER TABLE public.t_essay OWNER TO postgres;

--
-- TOC entry 3676 (class 0 OID 0)
-- Dependencies: 239
-- Name: COLUMN t_essay.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.t_essay.user_id IS '用户';


--
-- TOC entry 240 (class 1259 OID 16489)
-- Name: t_essay_comment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.t_essay_comment (
    user_id bigint,
    id bigint NOT NULL,
    create_time timestamp(6) without time zone DEFAULT NULL::timestamp without time zone,
    essay_id bigint,
    parent_comment_id bigint,
    admin_comment boolean DEFAULT false NOT NULL,
    content character varying(255) DEFAULT NULL::character varying
);


ALTER TABLE public.t_essay_comment OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 16495)
-- Name: t_essay_comment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.t_essay_comment ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.t_essay_comment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 242 (class 1259 OID 16496)
-- Name: t_essay_url_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.t_essay_url_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_essay_url_id_seq OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 16497)
-- Name: t_essay_url; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.t_essay_url (
    id bigint DEFAULT nextval('public.t_essay_url_id_seq'::regclass) NOT NULL,
    essay_id bigint NOT NULL,
    url character varying(512) NOT NULL,
    url_type character varying(50) DEFAULT NULL::character varying,
    url_desc character varying(255) DEFAULT NULL::character varying,
    is_valid boolean DEFAULT true,
    create_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    create_user_id bigint
);


ALTER TABLE public.t_essay_url OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 16507)
-- Name: t_message_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.t_message_id_seq
    START WITH 1060
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_message_id_seq OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 16508)
-- Name: t_message; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.t_message (
    id bigint DEFAULT nextval('public.t_message_id_seq'::regclass) NOT NULL,
    nickname character varying(255) DEFAULT NULL::character varying,
    avatar character varying(255) DEFAULT NULL::character varying,
    content character varying(255) DEFAULT NULL::character varying,
    create_time timestamp without time zone,
    parent_message_id bigint,
    admin_message boolean DEFAULT false NOT NULL
);


ALTER TABLE public.t_message OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 16518)
-- Name: t_project_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.t_project_id_seq
    START WITH 1069
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_project_id_seq OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 16519)
-- Name: t_project; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.t_project (
    title character varying(255) DEFAULT ''::character varying,
    content character varying(255) DEFAULT NULL::character varying,
    techs character varying(255) DEFAULT NULL::character varying,
    pic_url character varying(255) DEFAULT NULL::character varying,
    url character varying(255) DEFAULT NULL::character varying,
    id bigint DEFAULT nextval('public.t_project_id_seq'::regclass) NOT NULL,
    type integer,
    recommend boolean DEFAULT false,
    published boolean DEFAULT false
);


ALTER TABLE public.t_project OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 42796)
-- Name: t_project_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.t_project_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_project_seq OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 16531)
-- Name: t_tag; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.t_tag (
    id bigint NOT NULL,
    name character varying(255) DEFAULT NULL::character varying
);


ALTER TABLE public.t_tag OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 42797)
-- Name: t_tag_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.t_tag_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_tag_seq OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 16535)
-- Name: t_type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.t_type (
    id bigint NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    color character varying(255) DEFAULT NULL::character varying,
    pic_url character varying(255) DEFAULT NULL::character varying
);


ALTER TABLE public.t_type OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 16543)
-- Name: t_type_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.t_type ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.t_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 251 (class 1259 OID 16544)
-- Name: t_user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.t_user (
    id bigint NOT NULL,
    avatar character varying(255) DEFAULT NULL::character varying,
    create_time timestamp(6) without time zone DEFAULT NULL::timestamp without time zone,
    email character varying(255) DEFAULT NULL::character varying,
    nickname character varying(255) DEFAULT NULL::character varying,
    password character varying(255) DEFAULT NULL::character varying,
    type character varying(1) DEFAULT NULL::character varying,
    update_time timestamp(6) without time zone DEFAULT NULL::timestamp without time zone,
    username character varying(255) DEFAULT NULL::character varying,
    last_login_time timestamp without time zone,
    login_province character varying(255) DEFAULT NULL::character varying,
    login_city character varying(255) DEFAULT NULL::character varying,
    login_lat character varying,
    login_lng character varying,
    is_online boolean DEFAULT false
);


ALTER TABLE public.t_user OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 16560)
-- Name: t_user_blog_like; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.t_user_blog_like (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    blog_id bigint NOT NULL,
    is_like boolean DEFAULT true NOT NULL,
    created_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.t_user_blog_like OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 16565)
-- Name: t_user_blog_like_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.t_user_blog_like_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_user_blog_like_id_seq OWNER TO postgres;

--
-- TOC entry 3677 (class 0 OID 0)
-- Dependencies: 253
-- Name: t_user_blog_like_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.t_user_blog_like_id_seq OWNED BY public.t_user_blog_like.id;


--
-- TOC entry 254 (class 1259 OID 16566)
-- Name: t_user_essay_like; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.t_user_essay_like (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    essay_id bigint NOT NULL,
    is_like boolean DEFAULT true NOT NULL,
    created_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.t_user_essay_like OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 16571)
-- Name: t_user_essay_like_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.t_user_essay_like_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_user_essay_like_id_seq OWNER TO postgres;

--
-- TOC entry 3678 (class 0 OID 0)
-- Dependencies: 255
-- Name: t_user_essay_like_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.t_user_essay_like_id_seq OWNED BY public.t_user_essay_like.id;


--
-- TOC entry 256 (class 1259 OID 16572)
-- Name: t_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.t_user ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.t_user_id_seq
    START WITH 1100
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 264 (class 1259 OID 42798)
-- Name: t_user_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.t_user_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_user_seq OWNER TO postgres;

--
-- TOC entry 3306 (class 2604 OID 16573)
-- Name: atlas_tag id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_tag ALTER COLUMN id SET DEFAULT nextval('public.atlas_tag_id_seq'::regclass);


--
-- TOC entry 3307 (class 2604 OID 16574)
-- Name: atlas_visitcounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_visitcounts ALTER COLUMN id SET DEFAULT nextval('public.atlas_visitcounts_id_seq'::regclass);


--
-- TOC entry 3310 (class 2604 OID 42664)
-- Name: blog_monthly_visits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_monthly_visits ALTER COLUMN id SET DEFAULT nextval('public.blog_monthly_visits_id_seq'::regclass);


--
-- TOC entry 3313 (class 2604 OID 16576)
-- Name: friend_links id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.friend_links ALTER COLUMN id SET DEFAULT nextval('public.friend_links_id_seq'::regclass);


--
-- TOC entry 3318 (class 2604 OID 16577)
-- Name: personal_info id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal_info ALTER COLUMN id SET DEFAULT nextval('public.personal_info_id_seq'::regclass);


--
-- TOC entry 3380 (class 2604 OID 16578)
-- Name: t_user_blog_like id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_blog_like ALTER COLUMN id SET DEFAULT nextval('public.t_user_blog_like_id_seq'::regclass);


--
-- TOC entry 3383 (class 2604 OID 16579)
-- Name: t_user_essay_like id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_essay_like ALTER COLUMN id SET DEFAULT nextval('public.t_user_essay_like_id_seq'::regclass);


--
-- TOC entry 3394 (class 2606 OID 16597)
-- Name: atlas_files atlas_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_files
    ADD CONSTRAINT atlas_files_pkey PRIMARY KEY (id);


--
-- TOC entry 3397 (class 2606 OID 16599)
-- Name: atlas_files_tag atlas_files_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_files_tag
    ADD CONSTRAINT atlas_files_tag_pkey PRIMARY KEY (files_id, tag_id);


--
-- TOC entry 3402 (class 2606 OID 16601)
-- Name: atlas_tag atlas_tag_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_tag
    ADD CONSTRAINT atlas_tag_name_key UNIQUE (name);


--
-- TOC entry 3404 (class 2606 OID 16603)
-- Name: atlas_tag atlas_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_tag
    ADD CONSTRAINT atlas_tag_pkey PRIMARY KEY (id);


--
-- TOC entry 3406 (class 2606 OID 16605)
-- Name: atlas_type atlas_type_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_type
    ADD CONSTRAINT atlas_type_name_key UNIQUE (name);


--
-- TOC entry 3408 (class 2606 OID 16607)
-- Name: atlas_type atlas_type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_type
    ADD CONSTRAINT atlas_type_pkey PRIMARY KEY (type);


--
-- TOC entry 3410 (class 2606 OID 16609)
-- Name: atlas_visitcounts atlas_visitcounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_visitcounts
    ADD CONSTRAINT atlas_visitcounts_pkey PRIMARY KEY (id);


--
-- TOC entry 3412 (class 2606 OID 42666)
-- Name: blog_monthly_visits blog_monthly_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_monthly_visits
    ADD CONSTRAINT blog_monthly_visits_pkey PRIMARY KEY (id);


--
-- TOC entry 3414 (class 2606 OID 42673)
-- Name: blog_monthly_visits blog_monthly_visits_year_month_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_monthly_visits
    ADD CONSTRAINT blog_monthly_visits_year_month_key UNIQUE (year_month);


--
-- TOC entry 3416 (class 2606 OID 16615)
-- Name: friend_links friend_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.friend_links
    ADD CONSTRAINT friend_links_pkey PRIMARY KEY (id);


--
-- TOC entry 3418 (class 2606 OID 16617)
-- Name: personal_info personal_info_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal_info
    ADD CONSTRAINT personal_info_pkey PRIMARY KEY (id);


--
-- TOC entry 3420 (class 2606 OID 16619)
-- Name: private_message private_message_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.private_message
    ADD CONSTRAINT private_message_pkey PRIMARY KEY (id);


--
-- TOC entry 3424 (class 2606 OID 16621)
-- Name: t_blog t_blog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_blog
    ADD CONSTRAINT t_blog_pkey PRIMARY KEY (id);


--
-- TOC entry 3431 (class 2606 OID 16623)
-- Name: t_comment t_comment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_comment
    ADD CONSTRAINT t_comment_pkey PRIMARY KEY (id);


--
-- TOC entry 3476 (class 2606 OID 42661)
-- Name: t_doc t_doc_doc_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_doc
    ADD CONSTRAINT t_doc_doc_id_key UNIQUE (doc_id);


--
-- TOC entry 3478 (class 2606 OID 42659)
-- Name: t_doc t_doc_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_doc
    ADD CONSTRAINT t_doc_pkey PRIMARY KEY (id);


--
-- TOC entry 3438 (class 2606 OID 16625)
-- Name: t_essay_comment t_essay_comment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_essay_comment
    ADD CONSTRAINT t_essay_comment_pkey PRIMARY KEY (id);


--
-- TOC entry 3433 (class 2606 OID 16627)
-- Name: t_essay t_essay_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_essay
    ADD CONSTRAINT t_essay_pkey PRIMARY KEY (id);


--
-- TOC entry 3443 (class 2606 OID 16629)
-- Name: t_essay_url t_essay_url_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_essay_url
    ADD CONSTRAINT t_essay_url_pkey PRIMARY KEY (id);


--
-- TOC entry 3446 (class 2606 OID 16631)
-- Name: t_message t_message_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_message
    ADD CONSTRAINT t_message_pkey PRIMARY KEY (id);


--
-- TOC entry 3448 (class 2606 OID 16633)
-- Name: t_project t_project_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_project
    ADD CONSTRAINT t_project_pkey PRIMARY KEY (id);


--
-- TOC entry 3450 (class 2606 OID 16635)
-- Name: t_tag t_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_tag
    ADD CONSTRAINT t_tag_pkey PRIMARY KEY (id);


--
-- TOC entry 3452 (class 2606 OID 16637)
-- Name: t_type t_type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_type
    ADD CONSTRAINT t_type_pkey PRIMARY KEY (id);


--
-- TOC entry 3460 (class 2606 OID 16639)
-- Name: t_user_blog_like t_user_blog_like_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_blog_like
    ADD CONSTRAINT t_user_blog_like_pkey PRIMARY KEY (id);


--
-- TOC entry 3468 (class 2606 OID 16641)
-- Name: t_user_essay_like t_user_essay_like_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_essay_like
    ADD CONSTRAINT t_user_essay_like_pkey PRIMARY KEY (id);


--
-- TOC entry 3454 (class 2606 OID 16643)
-- Name: t_user t_user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user
    ADD CONSTRAINT t_user_pkey PRIMARY KEY (id);


--
-- TOC entry 3462 (class 2606 OID 16645)
-- Name: t_user_blog_like uk170aqkbuh81fgl0xm3fe8pbum; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_blog_like
    ADD CONSTRAINT uk170aqkbuh81fgl0xm3fe8pbum UNIQUE (user_id, blog_id);


--
-- TOC entry 3464 (class 2606 OID 16647)
-- Name: t_user_blog_like uk_user_blog; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_blog_like
    ADD CONSTRAINT uk_user_blog UNIQUE (user_id, blog_id);


--
-- TOC entry 3470 (class 2606 OID 16649)
-- Name: t_user_essay_like uk_user_essay; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_essay_like
    ADD CONSTRAINT uk_user_essay UNIQUE (user_id, essay_id);


--
-- TOC entry 3456 (class 2606 OID 16651)
-- Name: t_user uk_username; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user
    ADD CONSTRAINT uk_username UNIQUE (username);


--
-- TOC entry 3472 (class 2606 OID 16653)
-- Name: t_user_essay_like uktcrjho5x2dox7msggyep58fb6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_essay_like
    ADD CONSTRAINT uktcrjho5x2dox7msggyep58fb6 UNIQUE (user_id, essay_id);


--
-- TOC entry 3679 (class 0 OID 0)
-- Dependencies: 3414
-- Name: INDEX blog_monthly_visits_year_month_key; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.blog_monthly_visits_year_month_key IS '加速按年月查询访问量的索引';


--
-- TOC entry 3398 (class 1259 OID 16654)
-- Name: files_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX files_id_idx ON public.atlas_files_tag USING btree (files_id);


--
-- TOC entry 3399 (class 1259 OID 16655)
-- Name: fki_文件; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "fki_文件" ON public.atlas_files_tag USING btree (files_id);


--
-- TOC entry 3425 (class 1259 OID 16656)
-- Name: idx_t_blog_tags_blogs_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_blog_tags_blogs_id ON public.t_blog_tags USING btree (blogs_id);


--
-- TOC entry 3426 (class 1259 OID 16657)
-- Name: idx_t_blog_tags_tags_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_blog_tags_tags_id ON public.t_blog_tags USING btree (tags_id);


--
-- TOC entry 3421 (class 1259 OID 16658)
-- Name: idx_t_blog_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_blog_type_id ON public.t_blog USING btree (type_id);


--
-- TOC entry 3422 (class 1259 OID 16659)
-- Name: idx_t_blog_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_blog_user_id ON public.t_blog USING btree (user_id);


--
-- TOC entry 3427 (class 1259 OID 16660)
-- Name: idx_t_comment_blog_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_comment_blog_id ON public.t_comment USING btree (blog_id);


--
-- TOC entry 3428 (class 1259 OID 16661)
-- Name: idx_t_comment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_comment_id ON public.t_comment USING btree (id);


--
-- TOC entry 3429 (class 1259 OID 16662)
-- Name: idx_t_comment_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_comment_parent_id ON public.t_comment USING btree (parent_comment_id);


--
-- TOC entry 3473 (class 1259 OID 42662)
-- Name: idx_t_doc_recommend; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_doc_recommend ON public.t_doc USING btree (recommend);


--
-- TOC entry 3474 (class 1259 OID 42663)
-- Name: idx_t_doc_view_count; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_doc_view_count ON public.t_doc USING btree (view_count DESC);


--
-- TOC entry 3434 (class 1259 OID 16663)
-- Name: idx_t_essay_comment_essay_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_essay_comment_essay_id ON public.t_essay_comment USING btree (essay_id);


--
-- TOC entry 3435 (class 1259 OID 16664)
-- Name: idx_t_essay_comment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_essay_comment_id ON public.t_essay_comment USING btree (id);


--
-- TOC entry 3436 (class 1259 OID 16665)
-- Name: idx_t_essay_comment_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_essay_comment_parent_id ON public.t_essay_comment USING btree (parent_comment_id);


--
-- TOC entry 3439 (class 1259 OID 16666)
-- Name: idx_t_essay_url_essay_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_essay_url_essay_id ON public.t_essay_url USING btree (essay_id);


--
-- TOC entry 3440 (class 1259 OID 16667)
-- Name: idx_t_essay_url_is_valid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_essay_url_is_valid ON public.t_essay_url USING btree (is_valid);


--
-- TOC entry 3441 (class 1259 OID 16668)
-- Name: idx_t_essay_url_url_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_essay_url_url_type ON public.t_essay_url USING btree (url_type);


--
-- TOC entry 3444 (class 1259 OID 42780)
-- Name: idx_t_message_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_message_parent_id ON public.t_message USING btree (parent_message_id);


--
-- TOC entry 3457 (class 1259 OID 16670)
-- Name: idx_user_blog_like_blog_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_blog_like_blog_id ON public.t_user_blog_like USING btree (blog_id);


--
-- TOC entry 3458 (class 1259 OID 16671)
-- Name: idx_user_blog_like_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_blog_like_user_id ON public.t_user_blog_like USING btree (user_id);


--
-- TOC entry 3465 (class 1259 OID 16672)
-- Name: idx_user_essay_like_essay_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_essay_like_essay_id ON public.t_user_essay_like USING btree (essay_id);


--
-- TOC entry 3466 (class 1259 OID 16673)
-- Name: idx_user_essay_like_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_essay_like_user_id ON public.t_user_essay_like USING btree (user_id);


--
-- TOC entry 3400 (class 1259 OID 16674)
-- Name: tag_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tag_id_idx ON public.atlas_files_tag USING btree (tag_id);


--
-- TOC entry 3395 (class 1259 OID 16675)
-- Name: type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX type_idx ON public.atlas_files USING btree (type);


--
-- TOC entry 3502 (class 2620 OID 16676)
-- Name: personal_info update_personal_info_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_personal_info_modtime BEFORE UPDATE ON public.personal_info FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 3485 (class 2606 OID 16677)
-- Name: t_blog fk292449gwg5yf7ocdlmswv9w4j; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_blog
    ADD CONSTRAINT fk292449gwg5yf7ocdlmswv9w4j FOREIGN KEY (type_id) REFERENCES public.t_type(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- TOC entry 3489 (class 2606 OID 16682)
-- Name: t_comment fk4jj284r3pb7japogvo6h72q95; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_comment
    ADD CONSTRAINT fk4jj284r3pb7japogvo6h72q95 FOREIGN KEY (parent_comment_id) REFERENCES public.t_comment(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- TOC entry 3487 (class 2606 OID 16687)
-- Name: t_blog_tags fk5feau0gb4lq47fdb03uboswm8; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_blog_tags
    ADD CONSTRAINT fk5feau0gb4lq47fdb03uboswm8 FOREIGN KEY (tags_id) REFERENCES public.t_tag(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- TOC entry 3486 (class 2606 OID 16692)
-- Name: t_blog fk8ky5rrsxh01nkhctmo7d48p82; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_blog
    ADD CONSTRAINT fk8ky5rrsxh01nkhctmo7d48p82 FOREIGN KEY (user_id) REFERENCES public.t_user(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- TOC entry 3491 (class 2606 OID 16697)
-- Name: t_essay fk_essay_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_essay
    ADD CONSTRAINT fk_essay_user FOREIGN KEY (user_id) REFERENCES public.t_user(id);


--
-- TOC entry 3492 (class 2606 OID 16702)
-- Name: t_essay_comment fk_t_essay_comment_essay_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_essay_comment
    ADD CONSTRAINT fk_t_essay_comment_essay_id FOREIGN KEY (essay_id) REFERENCES public.t_essay(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- TOC entry 3493 (class 2606 OID 16707)
-- Name: t_essay_comment fk_t_essay_comment_parent_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_essay_comment
    ADD CONSTRAINT fk_t_essay_comment_parent_id FOREIGN KEY (parent_comment_id) REFERENCES public.t_essay_comment(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- TOC entry 3494 (class 2606 OID 16712)
-- Name: t_essay_comment fk_t_essay_comment_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_essay_comment
    ADD CONSTRAINT fk_t_essay_comment_user_id FOREIGN KEY (user_id) REFERENCES public.t_user(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- TOC entry 3495 (class 2606 OID 16717)
-- Name: t_essay_url fk_t_essay_url_create_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_essay_url
    ADD CONSTRAINT fk_t_essay_url_create_user FOREIGN KEY (create_user_id) REFERENCES public.t_user(id) ON UPDATE RESTRICT ON DELETE SET NULL;


--
-- TOC entry 3496 (class 2606 OID 16722)
-- Name: t_essay_url fk_t_essay_url_essay_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_essay_url
    ADD CONSTRAINT fk_t_essay_url_essay_id FOREIGN KEY (essay_id) REFERENCES public.t_essay(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- TOC entry 3497 (class 2606 OID 42781)
-- Name: t_message fk_t_message_parent_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_message
    ADD CONSTRAINT fk_t_message_parent_id FOREIGN KEY (parent_message_id) REFERENCES public.t_message(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- TOC entry 3498 (class 2606 OID 16732)
-- Name: t_user_blog_like fk_user_blog_like_blog; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_blog_like
    ADD CONSTRAINT fk_user_blog_like_blog FOREIGN KEY (blog_id) REFERENCES public.t_blog(id) ON DELETE CASCADE;


--
-- TOC entry 3499 (class 2606 OID 16737)
-- Name: t_user_blog_like fk_user_blog_like_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_blog_like
    ADD CONSTRAINT fk_user_blog_like_user FOREIGN KEY (user_id) REFERENCES public.t_user(id) ON DELETE CASCADE;


--
-- TOC entry 3500 (class 2606 OID 16742)
-- Name: t_user_essay_like fk_user_essay_like_essay; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_essay_like
    ADD CONSTRAINT fk_user_essay_like_essay FOREIGN KEY (essay_id) REFERENCES public.t_essay(id) ON DELETE CASCADE;


--
-- TOC entry 3501 (class 2606 OID 16747)
-- Name: t_user_essay_like fk_user_essay_like_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_essay_like
    ADD CONSTRAINT fk_user_essay_like_user FOREIGN KEY (user_id) REFERENCES public.t_user(id) ON DELETE CASCADE;


--
-- TOC entry 3488 (class 2606 OID 16752)
-- Name: t_blog_tags fkh4pacwjwofrugxa9hpwaxg6mr; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_blog_tags
    ADD CONSTRAINT fkh4pacwjwofrugxa9hpwaxg6mr FOREIGN KEY (blogs_id) REFERENCES public.t_blog(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- TOC entry 3490 (class 2606 OID 16757)
-- Name: t_comment fkke3uogd04j4jx316m1p51e05u; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_comment
    ADD CONSTRAINT fkke3uogd04j4jx316m1p51e05u FOREIGN KEY (blog_id) REFERENCES public.t_blog(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- TOC entry 3483 (class 2606 OID 16762)
-- Name: private_message private_message_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.private_message
    ADD CONSTRAINT private_message_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.t_user(id);


--
-- TOC entry 3484 (class 2606 OID 16767)
-- Name: private_message private_message_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.private_message
    ADD CONSTRAINT private_message_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.t_user(id);


--
-- TOC entry 3479 (class 2606 OID 16772)
-- Name: atlas_files 分类唯一; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_files
    ADD CONSTRAINT "分类唯一" FOREIGN KEY (type) REFERENCES public.atlas_type(type) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- TOC entry 3481 (class 2606 OID 16777)
-- Name: atlas_files_tag 文件; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_files_tag
    ADD CONSTRAINT "文件" FOREIGN KEY (files_id) REFERENCES public.atlas_files(id) ON DELETE CASCADE;


--
-- TOC entry 3482 (class 2606 OID 16782)
-- Name: atlas_files_tag 标签; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_files_tag
    ADD CONSTRAINT "标签" FOREIGN KEY (tag_id) REFERENCES public.atlas_tag(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3480 (class 2606 OID 16787)
-- Name: atlas_files 用户关联; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_files
    ADD CONSTRAINT "用户关联" FOREIGN KEY (user_id) REFERENCES public.t_user(id) NOT VALID;


--
-- TOC entry 3654 (class 0 OID 0)
-- Dependencies: 3653
-- Name: DATABASE blog; Type: ACL; Schema: -; Owner: postgres
--

GRANT ALL ON DATABASE blog TO blog;


--
-- TOC entry 3655 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO blog;


-- Completed on 2026-04-22 17:03:47

--
-- PostgreSQL database dump complete
--

--
-- Database "chat_db" dump
--

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.0

-- Started on 2026-04-22 17:03:47

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 3388 (class 1262 OID 25382)
-- Name: chat_db; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE chat_db WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.UTF-8';


ALTER DATABASE chat_db OWNER TO postgres;

\connect chat_db

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 225 (class 1255 OID 25469)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
                NEW.updated_at = NOW();
                RETURN NEW;
            END;
            $$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 218 (class 1259 OID 25387)
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id integer NOT NULL,
    conversation_id character varying NOT NULL,
    user_id character varying NOT NULL,
    title character varying,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 25386)
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conversations_id_seq OWNER TO postgres;

--
-- TOC entry 3391 (class 0 OID 0)
-- Dependencies: 217
-- Name: conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;


--
-- TOC entry 222 (class 1259 OID 25414)
-- Name: long_term_memories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.long_term_memories (
    id integer NOT NULL,
    memory_id character varying NOT NULL,
    conversation_id character varying NOT NULL,
    content text NOT NULL,
    memory_type character varying NOT NULL,
    importance integer,
    created_at timestamp without time zone,
    vector_id character varying
);


ALTER TABLE public.long_term_memories OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 25413)
-- Name: long_term_memories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.long_term_memories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.long_term_memories_id_seq OWNER TO postgres;

--
-- TOC entry 3392 (class 0 OID 0)
-- Dependencies: 221
-- Name: long_term_memories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.long_term_memories_id_seq OWNED BY public.long_term_memories.id;


--
-- TOC entry 224 (class 1259 OID 25451)
-- Name: memory_metadata; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.memory_metadata (
    id integer NOT NULL,
    memory_id character varying(255) NOT NULL,
    content text NOT NULL,
    memory_type character varying(50) DEFAULT 'general'::character varying NOT NULL,
    importance integer DEFAULT 1 NOT NULL,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.memory_metadata OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 25450)
-- Name: memory_metadata_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.memory_metadata_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.memory_metadata_id_seq OWNER TO postgres;

--
-- TOC entry 3393 (class 0 OID 0)
-- Dependencies: 223
-- Name: memory_metadata_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.memory_metadata_id_seq OWNED BY public.memory_metadata.id;


--
-- TOC entry 220 (class 1259 OID 25399)
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    conversation_id character varying NOT NULL,
    role character varying NOT NULL,
    content text NOT NULL,
    "timestamp" timestamp without time zone
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 25398)
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO postgres;

--
-- TOC entry 3394 (class 0 OID 0)
-- Dependencies: 219
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- TOC entry 3207 (class 2604 OID 25390)
-- Name: conversations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations ALTER COLUMN id SET DEFAULT nextval('public.conversations_id_seq'::regclass);


--
-- TOC entry 3209 (class 2604 OID 25417)
-- Name: long_term_memories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.long_term_memories ALTER COLUMN id SET DEFAULT nextval('public.long_term_memories_id_seq'::regclass);


--
-- TOC entry 3210 (class 2604 OID 25454)
-- Name: memory_metadata id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memory_metadata ALTER COLUMN id SET DEFAULT nextval('public.memory_metadata_id_seq'::regclass);


--
-- TOC entry 3208 (class 2604 OID 25402)
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- TOC entry 3216 (class 2606 OID 25394)
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- TOC entry 3226 (class 2606 OID 25421)
-- Name: long_term_memories long_term_memories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.long_term_memories
    ADD CONSTRAINT long_term_memories_pkey PRIMARY KEY (id);


--
-- TOC entry 3232 (class 2606 OID 25464)
-- Name: memory_metadata memory_metadata_memory_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memory_metadata
    ADD CONSTRAINT memory_metadata_memory_id_key UNIQUE (memory_id);


--
-- TOC entry 3234 (class 2606 OID 25462)
-- Name: memory_metadata memory_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memory_metadata
    ADD CONSTRAINT memory_metadata_pkey PRIMARY KEY (id);


--
-- TOC entry 3222 (class 2606 OID 25406)
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- TOC entry 3227 (class 1259 OID 25468)
-- Name: idx_memory_metadata_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_memory_metadata_created_at ON public.memory_metadata USING btree (created_at);


--
-- TOC entry 3228 (class 1259 OID 25467)
-- Name: idx_memory_metadata_importance; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_memory_metadata_importance ON public.memory_metadata USING btree (importance);


--
-- TOC entry 3229 (class 1259 OID 25465)
-- Name: idx_memory_metadata_memory_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_memory_metadata_memory_id ON public.memory_metadata USING btree (memory_id);


--
-- TOC entry 3230 (class 1259 OID 25466)
-- Name: idx_memory_metadata_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_memory_metadata_type ON public.memory_metadata USING btree (memory_type);


--
-- TOC entry 3217 (class 1259 OID 25395)
-- Name: ix_conversations_conversation_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_conversations_conversation_id ON public.conversations USING btree (conversation_id);


--
-- TOC entry 3218 (class 1259 OID 25396)
-- Name: ix_conversations_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_conversations_id ON public.conversations USING btree (id);


--
-- TOC entry 3219 (class 1259 OID 25397)
-- Name: ix_conversations_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_conversations_user_id ON public.conversations USING btree (user_id);


--
-- TOC entry 3223 (class 1259 OID 25428)
-- Name: ix_long_term_memories_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_long_term_memories_id ON public.long_term_memories USING btree (id);


--
-- TOC entry 3224 (class 1259 OID 25427)
-- Name: ix_long_term_memories_memory_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_long_term_memories_memory_id ON public.long_term_memories USING btree (memory_id);


--
-- TOC entry 3220 (class 1259 OID 25412)
-- Name: ix_messages_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_messages_id ON public.messages USING btree (id);


--
-- TOC entry 3237 (class 2620 OID 25480)
-- Name: memory_metadata update_memory_metadata_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_memory_metadata_updated_at BEFORE UPDATE ON public.memory_metadata FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 3236 (class 2606 OID 25422)
-- Name: long_term_memories long_term_memories_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.long_term_memories
    ADD CONSTRAINT long_term_memories_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(conversation_id);


--
-- TOC entry 3235 (class 2606 OID 25407)
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(conversation_id);


--
-- TOC entry 3389 (class 0 OID 0)
-- Dependencies: 3388
-- Name: DATABASE chat_db; Type: ACL; Schema: -; Owner: postgres
--

GRANT ALL ON DATABASE chat_db TO chat_db;


--
-- TOC entry 3390 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO chat_db;


-- Completed on 2026-04-22 17:03:49

--
-- PostgreSQL database dump complete
--

--
-- Database "postgres" dump
--

\connect postgres

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.0

-- Started on 2026-04-22 17:03:49

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 6 (class 2615 OID 24578)
-- Name: atlas; Type: SCHEMA; Schema: -; Owner: atlas
--

CREATE SCHEMA atlas;


ALTER SCHEMA atlas OWNER TO atlas;

--
-- TOC entry 5 (class 2615 OID 16390)
-- Name: blog; Type: SCHEMA; Schema: -; Owner: blog
--

CREATE SCHEMA blog;


ALTER SCHEMA blog OWNER TO blog;

--
-- TOC entry 8 (class 2615 OID 25384)
-- Name: chat_db; Type: SCHEMA; Schema: -; Owner: chat_db
--

CREATE SCHEMA chat_db;


ALTER SCHEMA chat_db OWNER TO chat_db;

--
-- TOC entry 7 (class 2615 OID 24581)
-- Name: interview; Type: SCHEMA; Schema: -; Owner: interview
--

CREATE SCHEMA interview;


ALTER SCHEMA interview OWNER TO interview;

--
-- TOC entry 3340 (class 0 OID 0)
-- Dependencies: 9
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO blog;
GRANT ALL ON SCHEMA public TO atlas;
GRANT ALL ON SCHEMA public TO interview;
GRANT ALL ON SCHEMA public TO chat_db;


-- Completed on 2026-04-22 17:03:52

--
-- PostgreSQL database dump complete
--

-- Completed on 2026-04-22 17:03:52

--
-- PostgreSQL database cluster dump complete
--

