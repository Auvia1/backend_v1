--
-- PostgreSQL database dump
--

\restrict qXF5O8rehBkzCI2aZSqZYJ4nhDAHmJjL6Wed5rSoLPRl2KoIK65CCKtd0mBrCvC

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: appointment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.appointment_status AS ENUM (
    'pending',
    'confirmed',
    'cancelled',
    'completed',
    'no_show',
    'rescheduled'
);


ALTER TYPE public.appointment_status OWNER TO postgres;

--
-- Name: billing_cycle_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.billing_cycle_type AS ENUM (
    'Monthly',
    'Quarterly',
    'Annually'
);


ALTER TYPE public.billing_cycle_type OWNER TO postgres;

--
-- Name: call_agent_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.call_agent_type_enum AS ENUM (
    'ai',
    'human'
);


ALTER TYPE public.call_agent_type_enum OWNER TO postgres;

--
-- Name: call_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.call_type_enum AS ENUM (
    'incoming',
    'outgoing'
);


ALTER TYPE public.call_type_enum OWNER TO postgres;

--
-- Name: gender_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.gender_type AS ENUM (
    'Male',
    'Female',
    'Other',
    'Prefer not to say'
);


ALTER TYPE public.gender_type OWNER TO postgres;

--
-- Name: payment_method_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_method_type AS ENUM (
    'Card',
    'UPI',
    'Bank Transfer'
);


ALTER TYPE public.payment_method_type OWNER TO postgres;

--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'paid',
    'failed',
    'refunded'
);


ALTER TYPE public.payment_status OWNER TO postgres;

--
-- Name: sub_status_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.sub_status_type AS ENUM (
    'trial',
    'active',
    'past_due',
    'canceled',
    'suspended'
);


ALTER TYPE public.sub_status_type OWNER TO postgres;

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'super_admin',
    'clinic_admin',
    'receptionist',
    'doctor'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- Name: create_default_clinic_settings(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_default_clinic_settings() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO clinic_settings (clinic_id)
  VALUES (NEW.id)
  ON CONFLICT (clinic_id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.create_default_clinic_settings() OWNER TO postgres;

--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION public.rls_auto_enable() OWNER TO postgres;

--
-- Name: touch_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.touch_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    event_type character varying(50) NOT NULL,
    title text NOT NULL,
    entity_type character varying(50),
    entity_id uuid,
    user_id uuid,
    meta jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT activity_log_event_type_check CHECK ((char_length(TRIM(BOTH FROM event_type)) > 0)),
    CONSTRAINT activity_log_title_check CHECK ((char_length(TRIM(BOTH FROM title)) > 0))
);


ALTER TABLE public.activity_log OWNER TO postgres;

--
-- Name: appointments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    appointment_start timestamp with time zone NOT NULL,
    appointment_end timestamp with time zone NOT NULL,
    reason text,
    notes text,
    status public.appointment_status DEFAULT 'pending'::public.appointment_status,
    source character varying(50) DEFAULT 'ai_agent'::character varying,
    payment_status character varying(50) DEFAULT 'unpaid'::character varying,
    payment_amount numeric(10,2),
    created_by uuid,
    cancelled_by uuid,
    version integer DEFAULT 1,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT appointments_payment_amount_check CHECK ((payment_amount >= (0)::numeric)),
    CONSTRAINT appointments_version_check CHECK ((version >= 1)),
    CONSTRAINT chk_appointment_times CHECK ((appointment_end > appointment_start))
);


ALTER TABLE public.appointments OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid,
    user_id uuid,
    action character varying(100) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id uuid NOT NULL,
    meta jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT audit_logs_action_check CHECK ((char_length(TRIM(BOTH FROM action)) > 0))
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: calls; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.calls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    "time" timestamp with time zone DEFAULT now() NOT NULL,
    type public.call_type_enum NOT NULL,
    caller character varying(255) NOT NULL,
    agent_type public.call_agent_type_enum DEFAULT 'ai'::public.call_agent_type_enum NOT NULL,
    duration integer DEFAULT 0 NOT NULL,
    ai_summary text,
    recording text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT calls_duration_check CHECK ((duration >= 0)),
    CONSTRAINT calls_recording_check CHECK (((recording IS NULL) OR (recording ~* '^https?://.+'::text)))
);


ALTER TABLE public.calls OWNER TO postgres;

--
-- Name: clinic_billing; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clinic_billing (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    plan character varying(50) DEFAULT 'trial'::character varying NOT NULL,
    billing_cycle public.billing_cycle_type DEFAULT 'Monthly'::public.billing_cycle_type NOT NULL,
    payment_method public.payment_method_type,
    payment_provider character varying(50),
    payment_token text,
    card_last4 character(4),
    card_name character varying(255),
    card_expiry character(5),
    gst_number character varying(15),
    monthly_amount numeric(10,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT clinic_billing_card_expiry_check CHECK ((card_expiry ~ '^(0[1-9]|1[0-2])\/[0-9]{2}$'::text)),
    CONSTRAINT clinic_billing_card_last4_check CHECK ((card_last4 ~ '^[0-9]{4}$'::text)),
    CONSTRAINT clinic_billing_gst_number_check CHECK (((gst_number IS NULL) OR ((gst_number)::text ~* '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'::text))),
    CONSTRAINT clinic_billing_monthly_amount_check CHECK ((monthly_amount >= (0)::numeric)),
    CONSTRAINT clinic_billing_plan_check CHECK (((plan)::text = ANY ((ARRAY['Starter'::character varying, 'Growth'::character varying, 'Enterprise'::character varying, 'trial'::character varying])::text[])))
);


ALTER TABLE public.clinic_billing OWNER TO postgres;

--
-- Name: clinic_contracts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clinic_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    contract_start date NOT NULL,
    contract_end date NOT NULL,
    agreement boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_contract_dates CHECK ((contract_end > contract_start))
);


ALTER TABLE public.clinic_contracts OWNER TO postgres;

--
-- Name: clinic_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clinic_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    file_url text NOT NULL,
    file_type character varying(100),
    file_size integer,
    doc_type character varying(100),
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT clinic_documents_file_name_check CHECK ((char_length(TRIM(BOTH FROM file_name)) > 0)),
    CONSTRAINT clinic_documents_file_size_check CHECK ((file_size > 0)),
    CONSTRAINT clinic_documents_file_url_check CHECK ((file_url ~* '^https?://.+'::text))
);


ALTER TABLE public.clinic_documents OWNER TO postgres;

--
-- Name: clinic_knowledge; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clinic_knowledge (
    id integer NOT NULL,
    chunk_text text NOT NULL,
    embedding public.vector(768)
);


ALTER TABLE public.clinic_knowledge OWNER TO postgres;

--
-- Name: clinic_knowledge_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clinic_knowledge_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clinic_knowledge_id_seq OWNER TO postgres;

--
-- Name: clinic_knowledge_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clinic_knowledge_id_seq OWNED BY public.clinic_knowledge.id;


--
-- Name: clinic_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clinic_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    advance_booking_days integer DEFAULT 30 NOT NULL,
    min_booking_notice_period integer DEFAULT 60 NOT NULL,
    cancellation_window_hours integer DEFAULT 24 NOT NULL,
    followup_time time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
    ai_agent_enabled boolean DEFAULT true NOT NULL,
    ai_agent_languages text[] DEFAULT ARRAY['en-IN'::text] NOT NULL,
    whatsapp_number character varying(15),
    logo_url text,
    price_per_appointment numeric(10,2) DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT clinic_settings_advance_booking_days_check CHECK ((advance_booking_days > 0)),
    CONSTRAINT clinic_settings_cancellation_window_hours_check CHECK ((cancellation_window_hours >= 0)),
    CONSTRAINT clinic_settings_logo_url_check CHECK (((logo_url IS NULL) OR (logo_url ~* '^https?://.+'::text))),
    CONSTRAINT clinic_settings_min_booking_notice_period_check CHECK ((min_booking_notice_period >= 0)),
    CONSTRAINT clinic_settings_price_per_appointment_check CHECK ((price_per_appointment >= (0)::numeric)),
    CONSTRAINT clinic_settings_whatsapp_number_check CHECK (((whatsapp_number IS NULL) OR ((whatsapp_number)::text ~ '^[0-9]{10,15}$'::text)))
);


ALTER TABLE public.clinic_settings OWNER TO postgres;

--
-- Name: clinics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clinics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    clinic_type character varying(100),
    address text,
    city character varying(100),
    state character varying(100),
    postal_code character varying(20),
    latitude numeric(9,6),
    longitude numeric(9,6),
    email character varying(255),
    phone character varying(20),
    owner_name character varying(255),
    username character varying(100),
    password text,
    timezone character varying(50) DEFAULT 'Asia/Kolkata'::character varying NOT NULL,
    subscription_plan character varying(50) DEFAULT 'trial'::character varying,
    subscription_status public.sub_status_type DEFAULT 'trial'::public.sub_status_type,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    owner_email character varying(255),
    owner_phone character varying(20),
    owner_id character varying(100),
    receptionist_name character varying(255),
    receptionist_email character varying(255),
    receptionist_phone character varying(20),
    receptionist_shift character varying(50),
    billing_cycle character varying(20),
    payment_method character varying(50),
    gst_number character varying(15),
    contract_start date,
    contract_end date,
    agreement boolean DEFAULT false,
    documents jsonb DEFAULT '[]'::jsonb,
    CONSTRAINT clinics_email_check CHECK (((email)::text ~* '^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+\.[A-Za-z]+$'::text)),
    CONSTRAINT clinics_name_check CHECK ((char_length(TRIM(BOTH FROM name)) > 0)),
    CONSTRAINT clinics_owner_email_check CHECK (((owner_email)::text ~* '^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+\.[A-Za-z]+$'::text)),
    CONSTRAINT clinics_phone_check CHECK (((phone)::text ~ '^[0-9]{10}$'::text)),
    CONSTRAINT clinics_receptionist_email_check CHECK (((receptionist_email)::text ~* '^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+\.[A-Za-z]+$'::text)),
    CONSTRAINT clinics_subscription_plan_check CHECK ((char_length(TRIM(BOTH FROM subscription_plan)) > 0))
);


ALTER TABLE public.clinics OWNER TO postgres;

--
-- Name: doctor_schedule; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.doctor_schedule (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    day_of_week integer,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    slot_duration_minutes integer NOT NULL,
    effective_from date DEFAULT CURRENT_DATE,
    effective_to date,
    CONSTRAINT chk_effective_dates CHECK (((effective_to IS NULL) OR (effective_to >= effective_from))),
    CONSTRAINT chk_schedule_times CHECK ((end_time > start_time)),
    CONSTRAINT doctor_schedule_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6))),
    CONSTRAINT doctor_schedule_slot_duration_minutes_check CHECK ((slot_duration_minutes > 0))
);


ALTER TABLE public.doctor_schedule OWNER TO postgres;

--
-- Name: doctor_time_off; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.doctor_time_off (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT chk_time_off_duration CHECK ((end_time > start_time))
);


ALTER TABLE public.doctor_time_off OWNER TO postgres;

--
-- Name: doctors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.doctors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    speciality character varying(255),
    consultation_duration_minutes integer DEFAULT 30,
    buffer_time_minutes integer DEFAULT 0,
    max_appointments_per_day integer,
    is_active boolean DEFAULT true,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    price_charged numeric(10,2) DEFAULT 0,
    CONSTRAINT doctors_buffer_time_minutes_check CHECK ((buffer_time_minutes >= 0)),
    CONSTRAINT doctors_consultation_duration_minutes_check CHECK ((consultation_duration_minutes > 0)),
    CONSTRAINT doctors_max_appointments_per_day_check CHECK ((max_appointments_per_day > 0)),
    CONSTRAINT doctors_name_check CHECK ((char_length(TRIM(BOTH FROM name)) > 0)),
    CONSTRAINT doctors_price_charged_check CHECK ((price_charged >= (0)::numeric))
);


ALTER TABLE public.doctors OWNER TO postgres;

--
-- Name: patients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(20) NOT NULL,
    email character varying(255),
    date_of_birth date,
    gender public.gender_type,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT patients_date_of_birth_check CHECK ((date_of_birth <= CURRENT_DATE)),
    CONSTRAINT patients_email_check CHECK (((email)::text ~* '^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+\.[A-Za-z]+$'::text)),
    CONSTRAINT patients_name_check CHECK ((char_length(TRIM(BOTH FROM name)) > 0)),
    CONSTRAINT patients_phone_check CHECK (((phone)::text ~ '^[0-9]{10}$'::text))
);


ALTER TABLE public.patients OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    appointment_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(10) DEFAULT 'INR'::character varying,
    status public.payment_status DEFAULT 'pending'::public.payment_status,
    provider character varying(50),
    provider_payment_id character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payments_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT payments_currency_check CHECK ((char_length(TRIM(BOTH FROM currency)) > 0))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: phone_numbers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.phone_numbers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid NOT NULL,
    number character varying(20) NOT NULL,
    service_type character varying(100) DEFAULT 'Reception Line'::character varying NOT NULL,
    status character varying(20) DEFAULT 'Live'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT phone_numbers_number_check CHECK (((number)::text ~ '^\+?[0-9 \-]{7,20}$'::text)),
    CONSTRAINT phone_numbers_status_check CHECK (((status)::text = ANY ((ARRAY['Live'::character varying, 'Inactive'::character varying, 'Provisioning'::character varying, 'Failed'::character varying])::text[])))
);


ALTER TABLE public.phone_numbers OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clinic_id uuid,
    name character varying(255),
    email character varying(255) NOT NULL,
    phone character varying(20),
    password_hash text NOT NULL,
    role public.user_role NOT NULL,
    govt_id character varying(100),
    shift_hours character varying(100),
    is_active boolean DEFAULT true,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_email_check CHECK (((email)::text ~* '^[A-Za-z0-9._+%-]+@[A-Za-z0-9.-]+\.[A-Za-z]+$'::text)),
    CONSTRAINT users_name_check CHECK ((char_length(TRIM(BOTH FROM name)) > 0)),
    CONSTRAINT users_password_hash_check CHECK ((char_length(password_hash) > 0)),
    CONSTRAINT users_phone_check CHECK (((phone)::text ~ '^[0-9]{10}$'::text))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: clinic_knowledge id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_knowledge ALTER COLUMN id SET DEFAULT nextval('public.clinic_knowledge_id_seq'::regclass);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_doctor_id_appointment_start_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_doctor_id_appointment_start_key UNIQUE (doctor_id, appointment_start);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: calls calls_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_pkey PRIMARY KEY (id);


--
-- Name: clinic_billing clinic_billing_clinic_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_billing
    ADD CONSTRAINT clinic_billing_clinic_id_key UNIQUE (clinic_id);


--
-- Name: clinic_billing clinic_billing_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_billing
    ADD CONSTRAINT clinic_billing_pkey PRIMARY KEY (id);


--
-- Name: clinic_contracts clinic_contracts_clinic_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_contracts
    ADD CONSTRAINT clinic_contracts_clinic_id_key UNIQUE (clinic_id);


--
-- Name: clinic_contracts clinic_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_contracts
    ADD CONSTRAINT clinic_contracts_pkey PRIMARY KEY (id);


--
-- Name: clinic_documents clinic_documents_clinic_id_file_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_documents
    ADD CONSTRAINT clinic_documents_clinic_id_file_name_key UNIQUE (clinic_id, file_name);


--
-- Name: clinic_documents clinic_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_documents
    ADD CONSTRAINT clinic_documents_pkey PRIMARY KEY (id);


--
-- Name: clinic_knowledge clinic_knowledge_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_knowledge
    ADD CONSTRAINT clinic_knowledge_pkey PRIMARY KEY (id);


--
-- Name: clinic_settings clinic_settings_clinic_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_settings
    ADD CONSTRAINT clinic_settings_clinic_id_key UNIQUE (clinic_id);


--
-- Name: clinic_settings clinic_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_settings
    ADD CONSTRAINT clinic_settings_pkey PRIMARY KEY (id);


--
-- Name: clinics clinics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinics
    ADD CONSTRAINT clinics_pkey PRIMARY KEY (id);


--
-- Name: clinics clinics_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinics
    ADD CONSTRAINT clinics_username_key UNIQUE (username);


--
-- Name: doctor_schedule doctor_schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_schedule
    ADD CONSTRAINT doctor_schedule_pkey PRIMARY KEY (id);


--
-- Name: doctor_time_off doctor_time_off_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_time_off
    ADD CONSTRAINT doctor_time_off_pkey PRIMARY KEY (id);


--
-- Name: doctors doctors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_pkey PRIMARY KEY (id);


--
-- Name: patients patients_clinic_id_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_clinic_id_phone_key UNIQUE (clinic_id, phone);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: phone_numbers phone_numbers_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phone_numbers
    ADD CONSTRAINT phone_numbers_number_key UNIQUE (number);


--
-- Name: phone_numbers phone_numbers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phone_numbers
    ADD CONSTRAINT phone_numbers_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: clinic_knowledge_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX clinic_knowledge_embedding_idx ON public.clinic_knowledge USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: idx_activity_log_clinic_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_log_clinic_id ON public.activity_log USING btree (clinic_id);


--
-- Name: idx_activity_log_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_log_created_at ON public.activity_log USING btree (created_at DESC);


--
-- Name: idx_activity_log_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_log_entity ON public.activity_log USING btree (entity_type, entity_id);


--
-- Name: idx_appointments_clinic_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appointments_clinic_id ON public.appointments USING btree (clinic_id);


--
-- Name: idx_appointments_doctor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appointments_doctor_id ON public.appointments USING btree (doctor_id);


--
-- Name: idx_appointments_patient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appointments_patient_id ON public.appointments USING btree (patient_id);


--
-- Name: idx_appointments_start; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_appointments_start ON public.appointments USING btree (appointment_start);


--
-- Name: idx_audit_logs_clinic_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_clinic_id ON public.audit_logs USING btree (clinic_id);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_calls_clinic_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_calls_clinic_id ON public.calls USING btree (clinic_id);


--
-- Name: idx_calls_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_calls_time ON public.calls USING btree ("time" DESC);


--
-- Name: idx_clinic_billing_clinic_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinic_billing_clinic_id ON public.clinic_billing USING btree (clinic_id);


--
-- Name: idx_clinic_contracts_clinic_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinic_contracts_clinic_id ON public.clinic_contracts USING btree (clinic_id);


--
-- Name: idx_clinic_documents_clinic_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinic_documents_clinic_id ON public.clinic_documents USING btree (clinic_id);


--
-- Name: idx_clinic_settings_clinic_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clinic_settings_clinic_id ON public.clinic_settings USING btree (clinic_id);


--
-- Name: idx_doctor_schedule_clinic_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doctor_schedule_clinic_id ON public.doctor_schedule USING btree (clinic_id);


--
-- Name: idx_doctor_schedule_doctor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doctor_schedule_doctor_id ON public.doctor_schedule USING btree (doctor_id);


--
-- Name: idx_doctors_clinic_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_doctors_clinic_id ON public.doctors USING btree (clinic_id);


--
-- Name: idx_patients_clinic_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_patients_clinic_id ON public.patients USING btree (clinic_id);


--
-- Name: idx_payments_appointment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_appointment_id ON public.payments USING btree (appointment_id);


--
-- Name: idx_payments_clinic_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_clinic_id ON public.payments USING btree (clinic_id);


--
-- Name: idx_phone_numbers_clinic_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_phone_numbers_clinic_id ON public.phone_numbers USING btree (clinic_id);


--
-- Name: idx_time_off_doctor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_time_off_doctor_id ON public.doctor_time_off USING btree (doctor_id);


--
-- Name: idx_users_clinic_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_clinic_id ON public.users USING btree (clinic_id);


--
-- Name: appointments trg_appointments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: calls trg_calls_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_calls_updated_at BEFORE UPDATE ON public.calls FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: clinic_billing trg_clinic_billing_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_clinic_billing_updated_at BEFORE UPDATE ON public.clinic_billing FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: clinic_contracts trg_clinic_contracts_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_clinic_contracts_updated_at BEFORE UPDATE ON public.clinic_contracts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: clinics trg_clinic_settings_on_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_clinic_settings_on_insert AFTER INSERT ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.create_default_clinic_settings();


--
-- Name: clinic_settings trg_clinic_settings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_clinic_settings_updated_at BEFORE UPDATE ON public.clinic_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: clinics trg_clinics_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_clinics_updated_at BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: doctors trg_doctors_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_doctors_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: phone_numbers trg_phone_numbers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_phone_numbers_updated_at BEFORE UPDATE ON public.phone_numbers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


--
-- Name: activity_log activity_log_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: appointments appointments_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: calls calls_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.calls
    ADD CONSTRAINT calls_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: clinic_billing clinic_billing_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_billing
    ADD CONSTRAINT clinic_billing_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: clinic_contracts clinic_contracts_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_contracts
    ADD CONSTRAINT clinic_contracts_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: clinic_documents clinic_documents_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_documents
    ADD CONSTRAINT clinic_documents_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: clinic_documents clinic_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_documents
    ADD CONSTRAINT clinic_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: clinic_settings clinic_settings_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinic_settings
    ADD CONSTRAINT clinic_settings_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: doctor_schedule doctor_schedule_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_schedule
    ADD CONSTRAINT doctor_schedule_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: doctor_schedule doctor_schedule_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_schedule
    ADD CONSTRAINT doctor_schedule_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- Name: doctor_time_off doctor_time_off_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_time_off
    ADD CONSTRAINT doctor_time_off_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: doctor_time_off doctor_time_off_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctor_time_off
    ADD CONSTRAINT doctor_time_off_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- Name: doctors doctors_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: patients patients_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: payments payments_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- Name: payments payments_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: phone_numbers phone_numbers_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phone_numbers
    ADD CONSTRAINT phone_numbers_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: users users_clinic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id) ON DELETE CASCADE;


--
-- Name: activity_log; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

--
-- Name: appointments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: calls; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

--
-- Name: clinic_billing; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.clinic_billing ENABLE ROW LEVEL SECURITY;

--
-- Name: clinic_contracts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.clinic_contracts ENABLE ROW LEVEL SECURITY;

--
-- Name: clinic_documents; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.clinic_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: clinic_knowledge; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.clinic_knowledge ENABLE ROW LEVEL SECURITY;

--
-- Name: clinic_settings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: clinics; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

--
-- Name: doctor_schedule; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.doctor_schedule ENABLE ROW LEVEL SECURITY;

--
-- Name: doctor_time_off; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.doctor_time_off ENABLE ROW LEVEL SECURITY;

--
-- Name: doctors; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

--
-- Name: patients; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

--
-- Name: payments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

--
-- Name: phone_numbers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: FUNCTION create_default_clinic_settings(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_default_clinic_settings() TO anon;
GRANT ALL ON FUNCTION public.create_default_clinic_settings() TO authenticated;
GRANT ALL ON FUNCTION public.create_default_clinic_settings() TO service_role;


--
-- Name: FUNCTION rls_auto_enable(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;


--
-- Name: FUNCTION touch_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.touch_updated_at() TO anon;
GRANT ALL ON FUNCTION public.touch_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.touch_updated_at() TO service_role;


--
-- Name: TABLE activity_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.activity_log TO anon;
GRANT ALL ON TABLE public.activity_log TO authenticated;
GRANT ALL ON TABLE public.activity_log TO service_role;


--
-- Name: TABLE appointments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.appointments TO anon;
GRANT ALL ON TABLE public.appointments TO authenticated;
GRANT ALL ON TABLE public.appointments TO service_role;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audit_logs TO anon;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;


--
-- Name: TABLE calls; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.calls TO anon;
GRANT ALL ON TABLE public.calls TO authenticated;
GRANT ALL ON TABLE public.calls TO service_role;


--
-- Name: TABLE clinic_billing; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.clinic_billing TO anon;
GRANT ALL ON TABLE public.clinic_billing TO authenticated;
GRANT ALL ON TABLE public.clinic_billing TO service_role;


--
-- Name: TABLE clinic_contracts; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.clinic_contracts TO anon;
GRANT ALL ON TABLE public.clinic_contracts TO authenticated;
GRANT ALL ON TABLE public.clinic_contracts TO service_role;


--
-- Name: TABLE clinic_documents; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.clinic_documents TO anon;
GRANT ALL ON TABLE public.clinic_documents TO authenticated;
GRANT ALL ON TABLE public.clinic_documents TO service_role;


--
-- Name: TABLE clinic_knowledge; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.clinic_knowledge TO anon;
GRANT ALL ON TABLE public.clinic_knowledge TO authenticated;
GRANT ALL ON TABLE public.clinic_knowledge TO service_role;


--
-- Name: SEQUENCE clinic_knowledge_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.clinic_knowledge_id_seq TO anon;
GRANT ALL ON SEQUENCE public.clinic_knowledge_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.clinic_knowledge_id_seq TO service_role;


--
-- Name: TABLE clinic_settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.clinic_settings TO anon;
GRANT ALL ON TABLE public.clinic_settings TO authenticated;
GRANT ALL ON TABLE public.clinic_settings TO service_role;


--
-- Name: TABLE clinics; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.clinics TO anon;
GRANT ALL ON TABLE public.clinics TO authenticated;
GRANT ALL ON TABLE public.clinics TO service_role;


--
-- Name: TABLE doctor_schedule; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.doctor_schedule TO anon;
GRANT ALL ON TABLE public.doctor_schedule TO authenticated;
GRANT ALL ON TABLE public.doctor_schedule TO service_role;


--
-- Name: TABLE doctor_time_off; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.doctor_time_off TO anon;
GRANT ALL ON TABLE public.doctor_time_off TO authenticated;
GRANT ALL ON TABLE public.doctor_time_off TO service_role;


--
-- Name: TABLE doctors; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.doctors TO anon;
GRANT ALL ON TABLE public.doctors TO authenticated;
GRANT ALL ON TABLE public.doctors TO service_role;


--
-- Name: TABLE patients; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.patients TO anon;
GRANT ALL ON TABLE public.patients TO authenticated;
GRANT ALL ON TABLE public.patients TO service_role;


--
-- Name: TABLE payments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.payments TO anon;
GRANT ALL ON TABLE public.payments TO authenticated;
GRANT ALL ON TABLE public.payments TO service_role;


--
-- Name: TABLE phone_numbers; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.phone_numbers TO anon;
GRANT ALL ON TABLE public.phone_numbers TO authenticated;
GRANT ALL ON TABLE public.phone_numbers TO service_role;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO anon;
GRANT ALL ON TABLE public.users TO authenticated;
GRANT ALL ON TABLE public.users TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict qXF5O8rehBkzCI2aZSqZYJ4nhDAHmJjL6Wed5rSoLPRl2KoIK65CCKtd0mBrCvC

