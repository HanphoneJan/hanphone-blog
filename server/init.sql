--
-- PostgreSQL database dump
--

-- Dumped from database version 17.11 (Debian 17.11-1.pgdg13+2)
-- Dumped by pg_dump version 17.5

-- Started on 2026-09-17 11:05:42

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
-- TOC entry 2 (class 3079 OID 16967)
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- TOC entry 3813 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- TOC entry 299 (class 1255 OID 17048)
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
-- TOC entry 218 (class 1259 OID 17049)
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
    user_id bigint,
    taken_time character varying(24)
);


ALTER TABLE public.atlas_files OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 17056)
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
-- TOC entry 220 (class 1259 OID 17057)
-- Name: atlas_files_tag; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.atlas_files_tag (
    files_id bigint NOT NULL,
    tag_id integer NOT NULL
);


ALTER TABLE public.atlas_files_tag OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 17060)
-- Name: atlas_tag; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.atlas_tag (
    id integer NOT NULL,
    name character varying(128)
);


ALTER TABLE public.atlas_tag OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 17063)
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
-- TOC entry 3814 (class 0 OID 0)
-- Dependencies: 222
-- Name: atlas_tag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.atlas_tag_id_seq OWNED BY public.atlas_tag.id;


--
-- TOC entry 223 (class 1259 OID 17064)
-- Name: atlas_type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.atlas_type (
    type integer NOT NULL,
    name character varying(128)
);


ALTER TABLE public.atlas_type OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 17067)
-- Name: atlas_visitcounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.atlas_visitcounts (
    id integer NOT NULL,
    visit_count integer DEFAULT 0 NOT NULL,
    last_visit timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.atlas_visitcounts OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 17072)
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
-- TOC entry 3815 (class 0 OID 0)
-- Dependencies: 225
-- Name: atlas_visitcounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.atlas_visitcounts_id_seq OWNED BY public.atlas_visitcounts.id;


--
-- TOC entry 226 (class 1259 OID 17073)
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
-- TOC entry 3816 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE blog_monthly_visits; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.blog_monthly_visits IS '存储博客网站的月度访问量数据';


--
-- TOC entry 3817 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN blog_monthly_visits.id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.blog_monthly_visits.id IS '记录唯一标识';


--
-- TOC entry 3818 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN blog_monthly_visits.year_month; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.blog_monthly_visits.year_month IS '年月标识（格式：YYYYMM）';


--
-- TOC entry 3819 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN blog_monthly_visits.total_visits; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.blog_monthly_visits.total_visits IS '当月网站总访问量';


--
-- TOC entry 3820 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN blog_monthly_visits.record_update_time; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.blog_monthly_visits.record_update_time IS '记录最后更新时间（带时区）';


--
-- Name: blog_visitor; Type: TABLE; Schema: public; Owner: blog
--

CREATE TABLE public.blog_visitor (
    id bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    ip character varying(64) NOT NULL,
    country character varying(128),
    province character varying(128),
    city character varying(128),
    first_visit_time timestamp with time zone NOT NULL,
    last_visit_time timestamp with time zone NOT NULL,
    visit_count bigint DEFAULT 1 NOT NULL
);

ALTER TABLE ONLY public.blog_visitor
    ADD CONSTRAINT blog_visitor_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.blog_visitor
    ADD CONSTRAINT uk_blog_visitor_ip UNIQUE (ip);


--
-- TOC entry 227 (class 1259 OID 17078)
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
-- TOC entry 3821 (class 0 OID 0)
-- Dependencies: 227
-- Name: blog_monthly_visits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.blog_monthly_visits_id_seq OWNED BY public.blog_monthly_visits.id;


--
-- TOC entry 228 (class 1259 OID 17079)
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
-- TOC entry 3822 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE friend_links; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.friend_links IS '友情链接表';


--
-- TOC entry 3823 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN friend_links.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.friend_links.name IS '友链名称';


--
-- TOC entry 3824 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN friend_links.url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.friend_links.url IS '友链URL';


--
-- TOC entry 3825 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN friend_links.link_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.friend_links.link_url IS '链接URL';


--
-- TOC entry 3826 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN friend_links.avatar; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.friend_links.avatar IS '头像图片URL';


--
-- TOC entry 3827 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN friend_links.recommend; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.friend_links.recommend IS '是否推荐';


--
-- TOC entry 3828 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN friend_links.create_time; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.friend_links.create_time IS '创建时间';


--
-- TOC entry 3829 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN friend_links.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.friend_links.description IS '友链描述';


--
-- TOC entry 3830 (class 0 OID 0)
-- Dependencies: 228
-- Name: COLUMN friend_links.color; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.friend_links.color IS '主题颜色';


--
-- TOC entry 229 (class 1259 OID 17088)
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
-- TOC entry 3831 (class 0 OID 0)
-- Dependencies: 229
-- Name: friend_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.friend_links_id_seq OWNED BY public.friend_links.id;


--
-- TOC entry 230 (class 1259 OID 17089)
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
-- TOC entry 231 (class 1259 OID 17090)
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
-- TOC entry 232 (class 1259 OID 17091)
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
-- TOC entry 233 (class 1259 OID 17099)
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
-- TOC entry 3832 (class 0 OID 0)
-- Dependencies: 233
-- Name: personal_info_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.personal_info_id_seq OWNED BY public.personal_info.id;


--
-- TOC entry 234 (class 1259 OID 17100)
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
-- TOC entry 235 (class 1259 OID 17101)
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
-- TOC entry 236 (class 1259 OID 17110)
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
-- TOC entry 237 (class 1259 OID 17111)
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
-- TOC entry 238 (class 1259 OID 17123)
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
-- TOC entry 239 (class 1259 OID 17124)
-- Name: t_blog_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.t_blog_tags (
    blogs_id bigint NOT NULL,
    tags_id bigint NOT NULL
);


ALTER TABLE public.t_blog_tags OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 17127)
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
-- TOC entry 241 (class 1259 OID 17137)
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
-- TOC entry 242 (class 1259 OID 17138)
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
-- TOC entry 243 (class 1259 OID 17149)
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
-- TOC entry 3833 (class 0 OID 0)
-- Dependencies: 243
-- Name: t_doc_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.t_doc_id_seq OWNED BY public.t_doc.id;


--
-- TOC entry 244 (class 1259 OID 17150)
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
-- TOC entry 245 (class 1259 OID 17151)
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
-- TOC entry 3834 (class 0 OID 0)
-- Dependencies: 245
-- Name: COLUMN t_essay.user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.t_essay.user_id IS '用户';


--
-- TOC entry 246 (class 1259 OID 17163)
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
-- TOC entry 247 (class 1259 OID 17169)
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
-- TOC entry 248 (class 1259 OID 17170)
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
-- TOC entry 249 (class 1259 OID 17171)
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
-- TOC entry 250 (class 1259 OID 17181)
-- Name: t_mcp_api_key; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.t_mcp_api_key (
    id bigint NOT NULL,
    active boolean NOT NULL,
    create_time timestamp(6) without time zone,
    key_value character varying(64) NOT NULL,
    last_used_at timestamp(6) without time zone,
    name character varying(64) NOT NULL,
    prefix character varying(16) NOT NULL,
    update_time timestamp(6) without time zone,
    user_id bigint
);


ALTER TABLE public.t_mcp_api_key OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 17184)
-- Name: t_mcp_api_key_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.t_mcp_api_key_seq
    START WITH 1
    INCREMENT BY 50
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_mcp_api_key_seq OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 17185)
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
-- TOC entry 253 (class 1259 OID 17186)
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
-- TOC entry 254 (class 1259 OID 17196)
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
-- TOC entry 255 (class 1259 OID 17197)
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
    published boolean DEFAULT false,
    created_time timestamp without time zone,
    update_time timestamp without time zone
);


ALTER TABLE public.t_project OWNER TO postgres;

--
-- TOC entry 256 (class 1259 OID 17210)
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
-- TOC entry 257 (class 1259 OID 17211)
-- Name: t_tag; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.t_tag (
    id bigint NOT NULL,
    name character varying(255) DEFAULT NULL::character varying
);


ALTER TABLE public.t_tag OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 17215)
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
-- TOC entry 259 (class 1259 OID 17216)
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
-- TOC entry 260 (class 1259 OID 17224)
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
-- TOC entry 261 (class 1259 OID 17225)
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
    is_online boolean DEFAULT false,
    github_id character varying(64),
    oauth_provider character varying(32),
    google_id character varying(64)
);


ALTER TABLE public.t_user OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 17241)
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
-- TOC entry 263 (class 1259 OID 17246)
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
-- TOC entry 3835 (class 0 OID 0)
-- Dependencies: 263
-- Name: t_user_blog_like_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.t_user_blog_like_id_seq OWNED BY public.t_user_blog_like.id;


--
-- TOC entry 264 (class 1259 OID 17247)
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
-- TOC entry 265 (class 1259 OID 17252)
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
-- TOC entry 3836 (class 0 OID 0)
-- Dependencies: 265
-- Name: t_user_essay_like_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.t_user_essay_like_id_seq OWNED BY public.t_user_essay_like.id;


--
-- TOC entry 266 (class 1259 OID 17253)
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
-- TOC entry 267 (class 1259 OID 17254)
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
-- TOC entry 3442 (class 2604 OID 17255)
-- Name: atlas_tag id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_tag ALTER COLUMN id SET DEFAULT nextval('public.atlas_tag_id_seq'::regclass);


--
-- TOC entry 3443 (class 2604 OID 17256)
-- Name: atlas_visitcounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_visitcounts ALTER COLUMN id SET DEFAULT nextval('public.atlas_visitcounts_id_seq'::regclass);


--
-- TOC entry 3446 (class 2604 OID 17257)
-- Name: blog_monthly_visits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_monthly_visits ALTER COLUMN id SET DEFAULT nextval('public.blog_monthly_visits_id_seq'::regclass);


--
-- TOC entry 3449 (class 2604 OID 17258)
-- Name: friend_links id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.friend_links ALTER COLUMN id SET DEFAULT nextval('public.friend_links_id_seq'::regclass);


--
-- TOC entry 3454 (class 2604 OID 17259)
-- Name: personal_info id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal_info ALTER COLUMN id SET DEFAULT nextval('public.personal_info_id_seq'::regclass);


--
-- TOC entry 3522 (class 2604 OID 17260)
-- Name: t_user_blog_like id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_blog_like ALTER COLUMN id SET DEFAULT nextval('public.t_user_blog_like_id_seq'::regclass);


--
-- TOC entry 3525 (class 2604 OID 17261)
-- Name: t_user_essay_like id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_essay_like ALTER COLUMN id SET DEFAULT nextval('public.t_user_essay_like_id_seq'::regclass);


--
-- TOC entry 3530 (class 2606 OID 17306)
-- Name: atlas_files atlas_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_files
    ADD CONSTRAINT atlas_files_pkey PRIMARY KEY (id);


--
-- TOC entry 3533 (class 2606 OID 17308)
-- Name: atlas_files_tag atlas_files_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_files_tag
    ADD CONSTRAINT atlas_files_tag_pkey PRIMARY KEY (files_id, tag_id);


--
-- TOC entry 3538 (class 2606 OID 17310)
-- Name: atlas_tag atlas_tag_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_tag
    ADD CONSTRAINT atlas_tag_name_key UNIQUE (name);


--
-- TOC entry 3540 (class 2606 OID 17312)
-- Name: atlas_tag atlas_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_tag
    ADD CONSTRAINT atlas_tag_pkey PRIMARY KEY (id);


--
-- TOC entry 3542 (class 2606 OID 17314)
-- Name: atlas_type atlas_type_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_type
    ADD CONSTRAINT atlas_type_name_key UNIQUE (name);


--
-- TOC entry 3544 (class 2606 OID 17316)
-- Name: atlas_type atlas_type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_type
    ADD CONSTRAINT atlas_type_pkey PRIMARY KEY (type);


--
-- TOC entry 3546 (class 2606 OID 17318)
-- Name: atlas_visitcounts atlas_visitcounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_visitcounts
    ADD CONSTRAINT atlas_visitcounts_pkey PRIMARY KEY (id);


--
-- TOC entry 3548 (class 2606 OID 17320)
-- Name: blog_monthly_visits blog_monthly_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_monthly_visits
    ADD CONSTRAINT blog_monthly_visits_pkey PRIMARY KEY (id);


--
-- TOC entry 3550 (class 2606 OID 17322)
-- Name: blog_monthly_visits blog_monthly_visits_year_month_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blog_monthly_visits
    ADD CONSTRAINT blog_monthly_visits_year_month_key UNIQUE (year_month);


--
-- TOC entry 3552 (class 2606 OID 17324)
-- Name: friend_links friend_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.friend_links
    ADD CONSTRAINT friend_links_pkey PRIMARY KEY (id);


--
-- TOC entry 3554 (class 2606 OID 17326)
-- Name: personal_info personal_info_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.personal_info
    ADD CONSTRAINT personal_info_pkey PRIMARY KEY (id);


--
-- TOC entry 3556 (class 2606 OID 17328)
-- Name: private_message private_message_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.private_message
    ADD CONSTRAINT private_message_pkey PRIMARY KEY (id);


--
-- TOC entry 3565 (class 2606 OID 17330)
-- Name: t_blog t_blog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_blog
    ADD CONSTRAINT t_blog_pkey PRIMARY KEY (id);


--
-- TOC entry 3573 (class 2606 OID 17332)
-- Name: t_comment t_comment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_comment
    ADD CONSTRAINT t_comment_pkey PRIMARY KEY (id);


--
-- TOC entry 3580 (class 2606 OID 17334)
-- Name: t_doc t_doc_doc_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_doc
    ADD CONSTRAINT t_doc_doc_id_key UNIQUE (doc_id);


--
-- TOC entry 3582 (class 2606 OID 17336)
-- Name: t_doc t_doc_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_doc
    ADD CONSTRAINT t_doc_pkey PRIMARY KEY (id);


--
-- TOC entry 3592 (class 2606 OID 17338)
-- Name: t_essay_comment t_essay_comment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_essay_comment
    ADD CONSTRAINT t_essay_comment_pkey PRIMARY KEY (id);


--
-- TOC entry 3587 (class 2606 OID 17340)
-- Name: t_essay t_essay_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_essay
    ADD CONSTRAINT t_essay_pkey PRIMARY KEY (id);


--
-- TOC entry 3597 (class 2606 OID 17342)
-- Name: t_essay_url t_essay_url_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_essay_url
    ADD CONSTRAINT t_essay_url_pkey PRIMARY KEY (id);


--
-- TOC entry 3599 (class 2606 OID 17344)
-- Name: t_mcp_api_key t_mcp_api_key_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_mcp_api_key
    ADD CONSTRAINT t_mcp_api_key_pkey PRIMARY KEY (id);


--
-- TOC entry 3604 (class 2606 OID 17346)
-- Name: t_message t_message_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_message
    ADD CONSTRAINT t_message_pkey PRIMARY KEY (id);


--
-- TOC entry 3610 (class 2606 OID 17348)
-- Name: t_project t_project_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_project
    ADD CONSTRAINT t_project_pkey PRIMARY KEY (id);


--
-- TOC entry 3612 (class 2606 OID 17350)
-- Name: t_tag t_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_tag
    ADD CONSTRAINT t_tag_pkey PRIMARY KEY (id);


--
-- TOC entry 3614 (class 2606 OID 17352)
-- Name: t_type t_type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_type
    ADD CONSTRAINT t_type_pkey PRIMARY KEY (id);


--
-- TOC entry 3624 (class 2606 OID 17354)
-- Name: t_user_blog_like t_user_blog_like_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_blog_like
    ADD CONSTRAINT t_user_blog_like_pkey PRIMARY KEY (id);


--
-- TOC entry 3632 (class 2606 OID 17356)
-- Name: t_user_essay_like t_user_essay_like_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_essay_like
    ADD CONSTRAINT t_user_essay_like_pkey PRIMARY KEY (id);


--
-- TOC entry 3618 (class 2606 OID 17358)
-- Name: t_user t_user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user
    ADD CONSTRAINT t_user_pkey PRIMARY KEY (id);


--
-- TOC entry 3626 (class 2606 OID 17360)
-- Name: t_user_blog_like uk170aqkbuh81fgl0xm3fe8pbum; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_blog_like
    ADD CONSTRAINT uk170aqkbuh81fgl0xm3fe8pbum UNIQUE (user_id, blog_id);


--
-- TOC entry 3601 (class 2606 OID 17362)
-- Name: t_mcp_api_key uk_7o1movd3n7qcu48p0wkoiqqgh; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_mcp_api_key
    ADD CONSTRAINT uk_7o1movd3n7qcu48p0wkoiqqgh UNIQUE (key_value);


--
-- TOC entry 3628 (class 2606 OID 17364)
-- Name: t_user_blog_like uk_user_blog; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_blog_like
    ADD CONSTRAINT uk_user_blog UNIQUE (user_id, blog_id);


--
-- TOC entry 3634 (class 2606 OID 17366)
-- Name: t_user_essay_like uk_user_essay; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_essay_like
    ADD CONSTRAINT uk_user_essay UNIQUE (user_id, essay_id);


--
-- TOC entry 3620 (class 2606 OID 17368)
-- Name: t_user uk_username; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user
    ADD CONSTRAINT uk_username UNIQUE (username);


--
-- TOC entry 3636 (class 2606 OID 17370)
-- Name: t_user_essay_like uktcrjho5x2dox7msggyep58fb6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_essay_like
    ADD CONSTRAINT uktcrjho5x2dox7msggyep58fb6 UNIQUE (user_id, essay_id);


--
-- TOC entry 3837 (class 0 OID 0)
-- Dependencies: 3550
-- Name: INDEX blog_monthly_visits_year_month_key; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON INDEX public.blog_monthly_visits_year_month_key IS '加速按年月查询访问量的索引';


--
-- TOC entry 3534 (class 1259 OID 17371)
-- Name: files_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX files_id_idx ON public.atlas_files_tag USING btree (files_id);


--
-- TOC entry 3535 (class 1259 OID 17372)
-- Name: fki_文件; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "fki_文件" ON public.atlas_files_tag USING btree (files_id);


--
-- TOC entry 3557 (class 1259 OID 17373)
-- Name: idx_blog_content_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blog_content_trgm ON public.t_blog USING gin (content public.gin_trgm_ops);


--
-- TOC entry 3558 (class 1259 OID 17374)
-- Name: idx_blog_description_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blog_description_trgm ON public.t_blog USING gin (description public.gin_trgm_ops);


--
-- TOC entry 3559 (class 1259 OID 25040)
-- Name: idx_blog_published_create_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blog_published_create_time ON public.t_blog USING btree (published, create_time);


--
-- TOC entry 3560 (class 1259 OID 25041)
-- Name: idx_blog_recommend_published; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blog_recommend_published ON public.t_blog USING btree (recommend, published);


--
-- TOC entry 3561 (class 1259 OID 17375)
-- Name: idx_blog_title_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blog_title_trgm ON public.t_blog USING gin (title public.gin_trgm_ops);


--
-- TOC entry 3568 (class 1259 OID 25042)
-- Name: idx_comment_create_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_comment_create_time ON public.t_comment USING btree (create_time);


--
-- TOC entry 3574 (class 1259 OID 17376)
-- Name: idx_doc_description_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doc_description_trgm ON public.t_doc USING gin (description public.gin_trgm_ops);


--
-- TOC entry 3575 (class 1259 OID 25045)
-- Name: idx_doc_published; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doc_published ON public.t_doc USING btree (published);


--
-- TOC entry 3576 (class 1259 OID 17377)
-- Name: idx_doc_title_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doc_title_trgm ON public.t_doc USING gin (title public.gin_trgm_ops);


--
-- TOC entry 3583 (class 1259 OID 17378)
-- Name: idx_essay_content_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_essay_content_trgm ON public.t_essay USING gin (content public.gin_trgm_ops);


--
-- TOC entry 3584 (class 1259 OID 25043)
-- Name: idx_essay_published; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_essay_published ON public.t_essay USING btree (published);


--
-- TOC entry 3585 (class 1259 OID 17379)
-- Name: idx_essay_title_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_essay_title_trgm ON public.t_essay USING gin (title public.gin_trgm_ops);


--
-- TOC entry 3605 (class 1259 OID 17380)
-- Name: idx_project_content_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_content_trgm ON public.t_project USING gin (content public.gin_trgm_ops);


--
-- TOC entry 3606 (class 1259 OID 25044)
-- Name: idx_project_published; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_published ON public.t_project USING btree (published);


--
-- TOC entry 3607 (class 1259 OID 17381)
-- Name: idx_project_techs_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_techs_trgm ON public.t_project USING gin (techs public.gin_trgm_ops);


--
-- TOC entry 3608 (class 1259 OID 17382)
-- Name: idx_project_title_trgm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_title_trgm ON public.t_project USING gin (title public.gin_trgm_ops);


--
-- TOC entry 3566 (class 1259 OID 17383)
-- Name: idx_t_blog_tags_blogs_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_blog_tags_blogs_id ON public.t_blog_tags USING btree (blogs_id);


--
-- TOC entry 3567 (class 1259 OID 17384)
-- Name: idx_t_blog_tags_tags_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_blog_tags_tags_id ON public.t_blog_tags USING btree (tags_id);


--
-- TOC entry 3562 (class 1259 OID 17385)
-- Name: idx_t_blog_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_blog_type_id ON public.t_blog USING btree (type_id);


--
-- TOC entry 3563 (class 1259 OID 17386)
-- Name: idx_t_blog_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_blog_user_id ON public.t_blog USING btree (user_id);


--
-- TOC entry 3569 (class 1259 OID 17387)
-- Name: idx_t_comment_blog_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_comment_blog_id ON public.t_comment USING btree (blog_id);


--
-- TOC entry 3570 (class 1259 OID 17388)
-- Name: idx_t_comment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_comment_id ON public.t_comment USING btree (id);


--
-- TOC entry 3571 (class 1259 OID 17389)
-- Name: idx_t_comment_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_comment_parent_id ON public.t_comment USING btree (parent_comment_id);


--
-- TOC entry 3577 (class 1259 OID 17390)
-- Name: idx_t_doc_recommend; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_doc_recommend ON public.t_doc USING btree (recommend);


--
-- TOC entry 3578 (class 1259 OID 17391)
-- Name: idx_t_doc_view_count; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_doc_view_count ON public.t_doc USING btree (view_count DESC);


--
-- TOC entry 3588 (class 1259 OID 17392)
-- Name: idx_t_essay_comment_essay_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_essay_comment_essay_id ON public.t_essay_comment USING btree (essay_id);


--
-- TOC entry 3589 (class 1259 OID 17393)
-- Name: idx_t_essay_comment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_essay_comment_id ON public.t_essay_comment USING btree (id);


--
-- TOC entry 3590 (class 1259 OID 17394)
-- Name: idx_t_essay_comment_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_essay_comment_parent_id ON public.t_essay_comment USING btree (parent_comment_id);


--
-- TOC entry 3593 (class 1259 OID 17395)
-- Name: idx_t_essay_url_essay_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_essay_url_essay_id ON public.t_essay_url USING btree (essay_id);


--
-- TOC entry 3594 (class 1259 OID 17396)
-- Name: idx_t_essay_url_is_valid; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_essay_url_is_valid ON public.t_essay_url USING btree (is_valid);


--
-- TOC entry 3595 (class 1259 OID 17397)
-- Name: idx_t_essay_url_url_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_essay_url_url_type ON public.t_essay_url USING btree (url_type);


--
-- TOC entry 3602 (class 1259 OID 17398)
-- Name: idx_t_message_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_t_message_parent_id ON public.t_message USING btree (parent_message_id);


--
-- TOC entry 3621 (class 1259 OID 17399)
-- Name: idx_user_blog_like_blog_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_blog_like_blog_id ON public.t_user_blog_like USING btree (blog_id);


--
-- TOC entry 3622 (class 1259 OID 17400)
-- Name: idx_user_blog_like_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_blog_like_user_id ON public.t_user_blog_like USING btree (user_id);


--
-- TOC entry 3629 (class 1259 OID 17401)
-- Name: idx_user_essay_like_essay_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_essay_like_essay_id ON public.t_user_essay_like USING btree (essay_id);


--
-- TOC entry 3630 (class 1259 OID 17402)
-- Name: idx_user_essay_like_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_essay_like_user_id ON public.t_user_essay_like USING btree (user_id);


--
-- TOC entry 3615 (class 1259 OID 17403)
-- Name: idx_user_github_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_user_github_id ON public.t_user USING btree (github_id) WHERE (github_id IS NOT NULL);


--
-- TOC entry 3616 (class 1259 OID 17404)
-- Name: idx_user_google_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_user_google_id ON public.t_user USING btree (google_id) WHERE (google_id IS NOT NULL);


--
-- TOC entry 3536 (class 1259 OID 17405)
-- Name: tag_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX tag_id_idx ON public.atlas_files_tag USING btree (tag_id);


--
-- TOC entry 3531 (class 1259 OID 17406)
-- Name: type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX type_idx ON public.atlas_files USING btree (type);


--
-- TOC entry 3661 (class 2620 OID 17407)
-- Name: personal_info update_personal_info_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_personal_info_modtime BEFORE UPDATE ON public.personal_info FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- TOC entry 3643 (class 2606 OID 17408)
-- Name: t_blog fk292449gwg5yf7ocdlmswv9w4j; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_blog
    ADD CONSTRAINT fk292449gwg5yf7ocdlmswv9w4j FOREIGN KEY (type_id) REFERENCES public.t_type(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- TOC entry 3647 (class 2606 OID 17413)
-- Name: t_comment fk4jj284r3pb7japogvo6h72q95; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_comment
    ADD CONSTRAINT fk4jj284r3pb7japogvo6h72q95 FOREIGN KEY (parent_comment_id) REFERENCES public.t_comment(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- TOC entry 3645 (class 2606 OID 17418)
-- Name: t_blog_tags fk5feau0gb4lq47fdb03uboswm8; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_blog_tags
    ADD CONSTRAINT fk5feau0gb4lq47fdb03uboswm8 FOREIGN KEY (tags_id) REFERENCES public.t_tag(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- TOC entry 3644 (class 2606 OID 17423)
-- Name: t_blog fk8ky5rrsxh01nkhctmo7d48p82; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_blog
    ADD CONSTRAINT fk8ky5rrsxh01nkhctmo7d48p82 FOREIGN KEY (user_id) REFERENCES public.t_user(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- TOC entry 3649 (class 2606 OID 17428)
-- Name: t_essay fk_essay_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_essay
    ADD CONSTRAINT fk_essay_user FOREIGN KEY (user_id) REFERENCES public.t_user(id);


--
-- TOC entry 3650 (class 2606 OID 17433)
-- Name: t_essay_comment fk_t_essay_comment_essay_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_essay_comment
    ADD CONSTRAINT fk_t_essay_comment_essay_id FOREIGN KEY (essay_id) REFERENCES public.t_essay(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- TOC entry 3651 (class 2606 OID 17438)
-- Name: t_essay_comment fk_t_essay_comment_parent_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_essay_comment
    ADD CONSTRAINT fk_t_essay_comment_parent_id FOREIGN KEY (parent_comment_id) REFERENCES public.t_essay_comment(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- TOC entry 3652 (class 2606 OID 17443)
-- Name: t_essay_comment fk_t_essay_comment_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_essay_comment
    ADD CONSTRAINT fk_t_essay_comment_user_id FOREIGN KEY (user_id) REFERENCES public.t_user(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- TOC entry 3653 (class 2606 OID 17448)
-- Name: t_essay_url fk_t_essay_url_create_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_essay_url
    ADD CONSTRAINT fk_t_essay_url_create_user FOREIGN KEY (create_user_id) REFERENCES public.t_user(id) ON UPDATE RESTRICT ON DELETE SET NULL;


--
-- TOC entry 3654 (class 2606 OID 17453)
-- Name: t_essay_url fk_t_essay_url_essay_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_essay_url
    ADD CONSTRAINT fk_t_essay_url_essay_id FOREIGN KEY (essay_id) REFERENCES public.t_essay(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- TOC entry 3656 (class 2606 OID 17458)
-- Name: t_message fk_t_message_parent_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_message
    ADD CONSTRAINT fk_t_message_parent_id FOREIGN KEY (parent_message_id) REFERENCES public.t_message(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- TOC entry 3657 (class 2606 OID 17463)
-- Name: t_user_blog_like fk_user_blog_like_blog; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_blog_like
    ADD CONSTRAINT fk_user_blog_like_blog FOREIGN KEY (blog_id) REFERENCES public.t_blog(id) ON DELETE CASCADE;


--
-- TOC entry 3658 (class 2606 OID 17468)
-- Name: t_user_blog_like fk_user_blog_like_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_blog_like
    ADD CONSTRAINT fk_user_blog_like_user FOREIGN KEY (user_id) REFERENCES public.t_user(id) ON DELETE CASCADE;


--
-- TOC entry 3659 (class 2606 OID 17473)
-- Name: t_user_essay_like fk_user_essay_like_essay; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_essay_like
    ADD CONSTRAINT fk_user_essay_like_essay FOREIGN KEY (essay_id) REFERENCES public.t_essay(id) ON DELETE CASCADE;


--
-- TOC entry 3660 (class 2606 OID 17478)
-- Name: t_user_essay_like fk_user_essay_like_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_user_essay_like
    ADD CONSTRAINT fk_user_essay_like_user FOREIGN KEY (user_id) REFERENCES public.t_user(id) ON DELETE CASCADE;


--
-- TOC entry 3646 (class 2606 OID 17483)
-- Name: t_blog_tags fkh4pacwjwofrugxa9hpwaxg6mr; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_blog_tags
    ADD CONSTRAINT fkh4pacwjwofrugxa9hpwaxg6mr FOREIGN KEY (blogs_id) REFERENCES public.t_blog(id) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- TOC entry 3655 (class 2606 OID 17488)
-- Name: t_mcp_api_key fkhjjvka5gjblfifldla6v50hfg; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_mcp_api_key
    ADD CONSTRAINT fkhjjvka5gjblfifldla6v50hfg FOREIGN KEY (user_id) REFERENCES public.t_user(id);


--
-- TOC entry 3648 (class 2606 OID 17493)
-- Name: t_comment fkke3uogd04j4jx316m1p51e05u; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.t_comment
    ADD CONSTRAINT fkke3uogd04j4jx316m1p51e05u FOREIGN KEY (blog_id) REFERENCES public.t_blog(id) ON UPDATE RESTRICT ON DELETE CASCADE;


--
-- TOC entry 3641 (class 2606 OID 17498)
-- Name: private_message private_message_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.private_message
    ADD CONSTRAINT private_message_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.t_user(id);


--
-- TOC entry 3642 (class 2606 OID 17503)
-- Name: private_message private_message_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.private_message
    ADD CONSTRAINT private_message_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.t_user(id);


--
-- TOC entry 3637 (class 2606 OID 17508)
-- Name: atlas_files 分类唯一; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_files
    ADD CONSTRAINT "分类唯一" FOREIGN KEY (type) REFERENCES public.atlas_type(type) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- TOC entry 3639 (class 2606 OID 17513)
-- Name: atlas_files_tag 文件; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_files_tag
    ADD CONSTRAINT "文件" FOREIGN KEY (files_id) REFERENCES public.atlas_files(id) ON DELETE CASCADE;


--
-- TOC entry 3640 (class 2606 OID 17518)
-- Name: atlas_files_tag 标签; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_files_tag
    ADD CONSTRAINT "标签" FOREIGN KEY (tag_id) REFERENCES public.atlas_tag(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 3638 (class 2606 OID 17523)
-- Name: atlas_files 用户关联; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.atlas_files
    ADD CONSTRAINT "用户关联" FOREIGN KEY (user_id) REFERENCES public.t_user(id) NOT VALID;


--
-- TOC entry 3812 (class 0 OID 0)
-- Dependencies: 6
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO blog;


-- Completed on 2026-09-17 11:05:51

--
-- PostgreSQL database dump complete
--

