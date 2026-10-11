import { useState, type ReactNode } from "react"

type Screen = "welcome" | "onboarding" | "profile" | "home" | "medications" | "add-medication" | "reminder" | "mood" | "symptoms" | "sleep" | "health" | "chat" | "wellness" | "safety" | "caregiver" | "location" | "alerts" | "reports" | "settings"

type IconName = "arrow" | "back" | "bell" | "calendar" | "camera" | "care" | "chat" | "check" | "chevron" | "clock" | "close" | "heart" | "home" | "location" | "meds" | "menu" | "mic" | "phone" | "plus" | "search" | "settings" | "shield" | "user" | "warning"

const carmenPhoto = "/carmen.jpg"

function Icon({ name, size = 22 }: { name: IconName size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
      </>
    ),
    back: <path d="m15 18-6-6 6-6" />,
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </>
    ),
    camera: (
      <>
        <path d="M14.5 5 13 3h-2L9.5 5H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" />
        <circle cx="12" cy="13" r="4" />
      </>
    ),
    care: (
      <>
        <path d="M20 12v8H4v-8" />
        <path d="M2 12 12 3l10 9" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    chat: <path d="M21 12a8 8 0 0 1-8 8H6l-4 2 1.5-5A9 9 0 1 1 21 12Z" />,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6l4 2" />
      </>
    ),
    close: <path d="m7 7 10 10M17 7 7 17" />,
    heart: (
      <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    location: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    meds: (
      <>
        <path d="m7.2 3.5 13.3 13.3a3 3 0 0 1-4.2 4.2L3 7.7a3 3 0 0 1 4.2-4.2Z" />
        <path d="m8.5 13.2 4.7-4.7" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    mic: (
      <>
        <rect x="9" y="3" width="6" height="12" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </>
    ),
    phone: (
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1Z" />
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2.8 2.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1 1.6v.2h-4V21a1.8 1.8 0 0 0-1.1-1.6 1.8 1.8 0 0 0-2 .4l-.1.1L4 17.1l.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.7-1H2.7v-4H3a1.8 1.8 0 0 0 1.6-1.1 1.8 1.8 0 0 0-.4-2L4 6.8 6.8 4l.1.1a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 10 2.8v-.1h4V3a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.4l.1-.1L20 6.9l-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.7 1h.2v4H21a1.8 1.8 0 0 0-1.6 1Z" />
      </>
    ),
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    warning: (
      <>
        <path d="M10.3 3.5 2.4 18a2 2 0 0 0 1.8 3h15.6a2 2 0 0 0 1.8-3L13.7 3.5a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
  }
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function Button({
  children,
  onClick,
  variant = "primary",
  icon,
  className = "",
}: {
  children: ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary" | "coral" | "danger" | "ghost"
  icon?: IconName
  className?: string
}) {
  return (
    <button className={`btn btn-${variant} ${className}`} onClick={onClick}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  )
}

function RobotAvatar({
  size = "medium",
}: {
  size?: "small" | "medium" | "large" | "hero"
}) {
  return (
    <div className={`robot-avatar robot-${size}`}>
      <img src="/buddy-logo.png" alt="BUDDY, asistente virtual" />
    </div>
  )
}

function Avatar({ size = "medium" }: { size?: "small" | "medium" | "large" }) {
  return (
    <img
      className={`person-avatar avatar-${size}`}
      src={carmenPhoto}
      alt="Carmen García"
    />
  )
}

function StatusBar() {
  return (
    <div className="status-bar">
      <span>9:41</span>
      <div className="status-icons">
        <span className="signal" />
        <span className="wifi" />
        <span className="battery" />
      </div>
    </div>
  )
}

function Header({
  title,
  subtitle,
  back,
  right,
}: {
  title: string
  subtitle?: string
  back?: () => void
  right?: ReactNode
}) {
  return (
    <div className="app-header">
      <div className="header-side">
        {back && (
          <button className="icon-btn" onClick={back} aria-label="Volver">
            <Icon name="back" />
          </button>
        )}
      </div>
      <div className="header-copy">
        <div className="header-title">{title}</div>
        {subtitle && <div className="header-subtitle">{subtitle}</div>}
      </div>
      <div className="header-side header-right">{right}</div>
    </div>
  )
}

function BottomNav({
  active,
  go,
}: {
  active: string
  go: (screen: Screen) => void
}) {
  const items: { label: string icon: IconName screen: Screen }[] = [
    { label: "Inicio", icon: "home", screen: "home" },
    { label: "Medicamentos", icon: "meds", screen: "medications" },
    { label: "Chat", icon: "chat", screen: "chat" },
    { label: "Bienestar", icon: "heart", screen: "wellness" },
  ]
  return (
    <div className="bottom-nav">
      {items.map((item) => (
        <button
          key={item.label}
          className={active === item.screen ? "nav-active" : ""}
          onClick={() => go(item.screen)}
        >
          <span className="nav-icon">
            <Icon name={item.icon} size={21} />
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

function ScreenShell({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`screen ${className}`}>
      <StatusBar />
      {children}
    </div>
  )
}

function Welcome({ go }: { go: (screen: Screen) => void }) {
  return (
    <ScreenShell className="welcome-screen">
      <div className="welcome-orb orb-one" />
      <div className="welcome-orb orb-two" />
      <div className="welcome-brand">
        <img src="/buddy-logo.png" alt="BUDDY, Siempre contigo" />
      </div>
      <div className="welcome-copy">
        <div className="eyebrow">BIENESTAR QUE TE ACOMPAÑA</div>
        <div className="display-title">
          Tu bienestar,
          <br />
          siempre acompañado
        </div>
        <div className="lead">
          Medicamentos, salud, ánimo, sueño y acompañamiento inteligente en un
          solo lugar.
        </div>
      </div>
      <div className="welcome-visual">
        <div className="robot-glow glow-mint" />
        <div className="robot-glow glow-lavender" />
        <div className="robot-glow glow-coral" />
        <div className="robot-hero-float">
          <RobotAvatar size="hero" />
        </div>
        <div className="trust-pill">
          <span>
            <Icon name="shield" size={16} />
          </span>{" "}
          Cuidado inteligente
        </div>
      </div>
      <div className="welcome-actions">
        <Button variant="coral" onClick={() => go("onboarding")}>
          Comenzar <Icon name="arrow" size={20} />
        </Button>
        <Button variant="ghost" onClick={() => go("profile")}>
          Iniciar sesión
        </Button>
      </div>
    </ScreenShell>
  )
}

function Onboarding({ go }: { go: (screen: Screen) => void }) {
  const [step, setStep] = useState(0)
  const slides = [
    {
      icon: "meds" as IconName,
      color: "mint",
      kicker: "MEDICAMENTOS",
      title: "Cada toma,\nsiempre a tiempo",
      text: "Recordatorios claros, horarios organizados y confirmación de cada medicamento.",
      stat: "4 tomas organizadas hoy",
    },
    {
      icon: "heart" as IconName,
      color: "lavender",
      kicker: "TU BIENESTAR",
      title: "Entiende cómo\nte sientes",
      text: "Registra tu ánimo, sueño, síntomas y datos de salud de forma simple y visual.",
      stat: "Bienestar de hoy: excelente",
    },
    {
      icon: "shield" as IconName,
      color: "coral",
      kicker: "SIEMPRE CERCA",
      title: "Acompañamiento\nque da tranquilidad",
      text: "BUDDY y tus personas de confianza pueden acompañarte cuando lo necesites.",
      stat: "Conexión familiar activa",
    },
  ]
  const slide = slides[step]
  const advance = () =>
    step < slides.length - 1 ? setStep(step + 1) : go("profile")
  return (
    <ScreenShell className="onboarding-screen">
      <div className="onboarding-top">
        <div className="brand-mini">
          <RobotAvatar size="small" />
          <span>BUDDY</span>
        </div>
        <button onClick={() => go("profile")}>Omitir</button>
      </div>
      <div className={`onboarding-art ${slide.color}`}>
        <span className="orbit orbit-one" />
        <span className="orbit orbit-two" />
        <div className="feature-icon">
          <Icon name={slide.icon} size={48} />
        </div>
        <div className="onboarding-buddy">
          <RobotAvatar size="large" />
        </div>
        <div className="floating-stat">
          <Icon name="check" size={16} />
          {slide.stat}
        </div>
      </div>
      <div className="onboarding-copy">
        <div className="eyebrow">{slide.kicker}</div>
        <div className="display-title">
          {slide.title.split("\n").map((line, index) => (
            <span key={line}>
              {line}
              {index === 0 && <br />}
            </span>
          ))}
        </div>
        <div className="lead">{slide.text}</div>
      </div>
      <div className="onboarding-footer">
        <div className="slide-dots">
          {slides.map((_, index) => (
            <button
              aria-label={`Ir al paso ${index + 1}`}
              key={index}
              className={index === step ? "active" : ""}
              onClick={() => setStep(index)}
            />
          ))}
        </div>
        <Button onClick={advance}>
          {step === slides.length - 1 ? "Elegir mi perfil" : "Continuar"}
          <Icon name="arrow" size={19} />
        </Button>
      </div>
    </ScreenShell>
  )
}

function ProfileChoice({ go }: { go: (screen: Screen) => void }) {
  return (
    <ScreenShell className="content-screen">
      <Header title="¿Cómo usarás BUDDY?" back={() => go("onboarding")} />
      <div className="section-intro">
        <div className="page-title">Una experiencia hecha para ti</div>
        <div className="muted">
          Elige tu perfil. Podrás cambiarlo cuando quieras.
        </div>
      </div>
      <div className="profile-options">
        <button className="profile-card senior-card" onClick={() => go("home")}>
          <span className="profile-art">
            <Avatar size="large" />
            <span className="mini-badge">
              <Icon name="heart" size={18} />
            </span>
          </span>
          <span className="profile-card-copy">
            <strong>Adulto mayor</strong>
            <small>
              Organiza tus medicamentos, bienestar y habla con BUDDY.
            </small>
          </span>
          <span className="round-arrow">
            <Icon name="arrow" size={19} />
          </span>
        </button>
        <button
          className="profile-card caregiver-card"
          onClick={() => go("caregiver")}
        >
          <span className="profile-art caregiver-art">
            <Icon name="care" size={36} />
            <span className="mini-badge coral">
              <Icon name="shield" size={18} />
            </span>
          </span>
          <span className="profile-card-copy">
            <strong>Familiar o cuidador</strong>
            <small>Acompaña, recibe alertas y mantente cerca.</small>
          </span>
          <span className="round-arrow">
            <Icon name="arrow" size={19} />
          </span>
        </button>
      </div>
      <div className="privacy-note">
        <Icon name="shield" size={18} />
        <span>
          Tu información está protegida y solo se comparte con tu autorización.
        </span>
      </div>
    </ScreenShell>
  )
}

function Home({ go }: { go: (screen: Screen) => void }) {
  return (
    <ScreenShell className="content-screen with-nav">
      <div className="home-top">
        <button className="icon-btn soft" aria-label="Menú">
          <Icon name="menu" />
        </button>
        <button
          className="avatar-button"
          onClick={() => go("settings")}
          aria-label="Abrir perfil"
        >
          <Avatar />
        </button>
      </div>
      <div className="greeting">
        <div className="eyebrow">LUNES, 10 DE MARZO</div>
        <div className="page-title">
          ¡Buenos días,
          <br />
          Carmen!
        </div>
        <div className="well-status">
          <span /> Todo está en orden hoy
        </div>
      </div>
      <button className="next-med-card" onClick={() => go("reminder")}>
        <span className="card-label">TU PRÓXIMO MEDICAMENTO</span>
        <span className="next-med-content">
          <span className="pill-visual coral-pill" />
          <span className="med-copy">
            <strong>Amlodipino</strong>
            <small>5 mg · 1 tableta</small>
            <span>
              <Icon name="clock" size={15} /> 10:00 a. m.
            </span>
          </span>
          <span className="round-arrow">
            <Icon name="chevron" />
          </span>
        </span>
      </button>
      <div className="progress-card">
        <div className="progress-head">
          <div>
            <span className="card-label">TU DÍA DE HOY</span>
            <strong>3 de 4 completados</strong>
          </div>
          <span className="progress-number">75%</span>
        </div>
        <div className="progress-track">
          <span />
        </div>
        <div className="progress-foot">
          <span>
            <Icon name="check" size={15} /> Mañana
          </span>
          <span>
            <Icon name="check" size={15} /> Mediodía
          </span>
          <span className="pending">
            <Icon name="clock" size={15} /> Noche
          </span>
        </div>
      </div>
      <button className="feeling-card" onClick={() => go("mood")}>
        <span className="feeling-icon">
          <Icon name="heart" size={26} />
        </span>
        <span>
          <small>¿CÓMO TE SIENTES HOY?</small>
          <strong>Cuéntaselo a BUDDY</strong>
        </span>
        <span className="mood-faces">
          <i>●</i>
          <i>●</i>
          <i>●</i>
        </span>
        <Icon name="chevron" size={19} />
      </button>
      <div className="quick-grid">
        <button className="quick-meds" onClick={() => go("medications")}>
          <span>
            <Icon name="meds" />
          </span>
          <strong>Medicamentos</strong>
          <small>3 de 4 tomados</small>
        </button>
        <button className="quick-health" onClick={() => go("health")}>
          <span>
            <Icon name="heart" />
          </span>
          <strong>Salud</strong>
          <small>Todo estable</small>
        </button>
        <button className="quick-sleep" onClick={() => go("sleep")}>
          <span>
            <Icon name="clock" />
          </span>
          <strong>Sueño</strong>
          <small>7h 20m</small>
        </button>
        <button className="quick-wellness" onClick={() => go("wellness")}>
          <span>
            <Icon name="care" />
          </span>
          <strong>Bienestar</strong>
          <small>3 metas listas</small>
        </button>
      </div>
      <div className="home-actions">
        <Button onClick={() => go("chat")} icon="chat">
          Hablar con BUDDY
        </Button>
        <Button variant="danger" onClick={() => go("alerts")} icon="shield">
          Emergencia <Icon name="arrow" size={19} />
        </Button>
      </div>
      <BottomNav active="home" go={go} />
    </ScreenShell>
  )
}

const medicationData = [
  {
    name: "Amlodipino",
    dose: "5 mg · 1 tableta",
    time: "8:00 a. m.",
    status: "Tomado",
    color: "coral",
  },
  {
    name: "Metformina",
    dose: "850 mg · 1 tableta",
    time: "2:00 p. m.",
    status: "Pendiente",
    color: "blue",
  },
  {
    name: "Vitamina D",
    dose: "1,000 UI · 1 tableta",
    time: "8:00 p. m.",
    status: "Pendiente",
    color: "yellow",
  },
  {
    name: "Omeprazol",
    dose: "20 mg · 1 tableta",
    time: "Antes del desayuno",
    status: "Tomado",
    color: "coral",
  },
]

function MedicationCard({
  med,
  onClick,
}: {
  med: typeof medicationData[number]
  onClick: () => void
}) {
  return (
    <button className="medication-card" onClick={onClick}>
      <span className={`pill-visual ${med.color}-pill`} />
      <span className="med-copy">
        <strong>{med.name}</strong>
        <small>{med.dose}</small>
        <span>
          <Icon name="clock" size={14} /> {med.time}
        </span>
      </span>
      <span
        className={`status ${med.status === "Tomado" ? "success" : "neutral"}`}
      >
        {med.status === "Tomado" && <Icon name="check" size={13} />}
        {med.status}
      </span>
    </button>
  )
}

function Medications({ go }: { go: (screen: Screen) => void }) {
  const [filter, setFilter] = useState("Todos")
  return (
    <ScreenShell className="content-screen with-nav">
      <Header
        title="Mis medicamentos"
        back={() => go("home")}
        right={
          <button
            className="icon-btn mint"
            onClick={() => go("add-medication")}
            aria-label="Agregar medicamento"
          >
            <Icon name="plus" />
          </button>
        }
      />
      <div className="segmented">
        {["Todos", "Hoy", "Próximos"].map((item) => (
          <button
            className={filter === item ? "active" : ""}
            onClick={() => setFilter(item)}
            key={item}
          >
            {item}
            {item === "Todos" && " (4)"}
          </button>
        ))}
      </div>
      <div className="medication-list">
        {medicationData.map((med) => (
          <MedicationCard
            key={med.name}
            med={med}
            onClick={() => go("reminder")}
          />
        ))}
      </div>
      <button className="safety-link" onClick={() => go("safety")}>
        <span className="link-icon">
          <Icon name="shield" />
        </span>
        <span>
          <strong>Seguridad de medicamentos</strong>
          <small>Revisa indicaciones e interacciones</small>
        </span>
        <Icon name="chevron" />
      </button>
      <BottomNav active="medications" go={go} />
    </ScreenShell>
  )
}

function Field({
  label,
  value,
  icon,
  wide = false,
}: {
  label: string
  value: string
  icon?: IconName
  wide?: boolean
}) {
  return (
    <label className={`field ${wide ? "field-wide" : ""}`}>
      <span>{label}</span>
      <span className="input-shell">
        {icon && <Icon name={icon} size={19} />}
        <input defaultValue={value} />
      </span>
    </label>
  )
}

function AddMedication({ go }: { go: (screen: Screen) => void }) {
  const [saved, setSaved] = useState(false)
  return (
    <ScreenShell className="content-screen form-screen">
      <Header title="Agregar medicamento" back={() => go("medications")} />
      {saved ? (
        <div className="success-state">
          <div className="success-orb">
            <Icon name="check" size={40} />
          </div>
          <div className="page-title">Medicamento guardado</div>
          <div className="muted">BUDDY te recordará cada toma a tiempo.</div>
          <Button onClick={() => go("medications")}>
            Volver a medicamentos
          </Button>
        </div>
      ) : (
        <div className="form-content">
          <Field
            label="Nombre del medicamento"
            value="Losartán"
            icon="meds"
            wide
          />
          <div className="form-grid">
            <Field label="Dosis" value="50 mg" />
            <Field label="Presentación" value="Tableta" />
          </div>
          <Field
            label="Frecuencia"
            value="Una vez al día"
            icon="calendar"
            wide
          />
          <Field label="Hora" value="09:00 a. m." icon="clock" wide />
          <Field label="Indicaciones" value="Tomar después del desayuno" wide />
          <div className="form-grid">
            <Field label="Fecha de inicio" value="10/03/2025" />
            <Field label="Fecha de fin" value="Opcional" />
          </div>
          <button className="photo-upload">
            <span>
              <Icon name="camera" />
            </span>
            <span>
              <strong>Foto del envase</strong>
              <small>Ayuda a identificarlo fácilmente</small>
            </span>
            <Icon name="plus" />
          </button>
          <Button onClick={() => setSaved(true)}>Guardar medicamento</Button>
        </div>
      )}
    </ScreenShell>
  )
}

function Reminder({ go }: { go: (screen: Screen) => void }) {
  const [done, setDone] = useState(false)
  return (
    <ScreenShell className="reminder-screen">
      <div className="reminder-top">
        <div className="brand-mini">
          <RobotAvatar size="small" />
          <span>BUDDY</span>
        </div>
        <button
          className="icon-btn soft"
          onClick={() => go("medications")}
          aria-label="Cerrar"
        >
          <Icon name="close" />
        </button>
      </div>
      {done ? (
        <div className="reminder-done">
          <div className="success-rings">
            <Icon name="check" size={52} />
          </div>
          <div className="display-title small-display">¡Muy bien, Carmen!</div>
          <div className="lead">
            Tu toma quedó registrada. El próximo recordatorio será a las 8:00 p.
            m.
          </div>
          <Button onClick={() => go("home")}>Volver al inicio</Button>
        </div>
      ) : (
        <>
          <div className="reminder-copy">
            <div className="eyebrow">RECORDATORIO DE LAS 10:00</div>
            <div className="display-title small-display">
              Es hora de tu
              <br />
              medicamento
            </div>
            <div className="lead">Cuidarte también es celebrar cada día.</div>
          </div>
          <div className="med-illustration">
            <div className="glow-ring ring-a" />
            <div className="glow-ring ring-b" />
            <span className="giant-pill">
              <i />
              <b />
            </span>
          </div>
          <div className="reminder-med">
            <strong>Amlodipino</strong>
            <span>5 mg · 1 tableta</span>
            <small>
              <Icon name="clock" size={17} /> 10:00 a. m.
            </small>
          </div>
          <div className="reminder-actions">
            <Button onClick={() => setDone(true)} icon="check">
              Ya lo tomé
            </Button>
            <div className="action-row">
              <Button
                variant="secondary"
                onClick={() => go("home")}
                icon="clock"
              >
                Posponer
              </Button>
              <Button variant="ghost" onClick={() => go("medications")}>
                No lo tomé
              </Button>
            </div>
          </div>
        </>
      )}
    </ScreenShell>
  )
}

function Chat({ go }: { go: (screen: Screen) => void }) {
  const [listening, setListening] = useState(false)
  return (
    <ScreenShell className="chat-screen with-nav">
      <div className="chat-header">
        <button className="icon-btn" onClick={() => go("home")}>
          <Icon name="back" />
        </button>
        <RobotAvatar size="small" />
        <div>
          <strong>BUDDY</strong>
          <small>
            <span /> Siempre contigo
          </small>
        </div>
        <button className="icon-btn">
          <Icon name="menu" />
        </button>
      </div>
      <div className="chat-date">HOY, 9:41 A. M.</div>
      <div className="messages">
        <div className="message-row buddy">
          <RobotAvatar size="small" />
          <div className="bubble">
            ¡Hola, Carmen!
            <br />
            ¿Cómo te sientes hoy?<time>9:40 a. m.</time>
          </div>
        </div>
        <div className="message-row user">
          <div className="bubble">
            Me siento muy bien hoy<time>9:41 a. m.</time>
          </div>
          <Avatar size="small" />
        </div>
        <div className="message-row buddy">
          <RobotAvatar size="small" />
          <div className="bubble">
            ¡Qué alegría! Tu bienestar también me alegra a mí. ¿Hay algo en lo
            que pueda ayudarte hoy?<time>9:41 a. m.</time>
          </div>
        </div>
      </div>
      <div className="suggestions">
        {[
          "¿Cómo está mi presión?",
          "Consejos de salud",
          "¿Qué puedo hacer hoy?",
        ].map((item) => (
          <button key={item}>
            {item}
            <Icon name="arrow" size={14} />
          </button>
        ))}
      </div>
      <div className={`voice-panel ${listening ? "listening" : ""}`}>
        <button className="voice-btn" onClick={() => setListening(!listening)}>
          <Icon name="mic" size={25} />
        </button>
        <div>
          <strong>
            {listening ? "Te escucho..." : "Presiona para hablar"}
          </strong>
          <small>
            {listening ? "Dime cómo puedo ayudarte" : "O escribe tu mensaje"}
          </small>
        </div>
        <button className="icon-btn">
          <Icon name="chat" />
        </button>
      </div>
      <BottomNav active="chat" go={go} />
    </ScreenShell>
  )
}

function Mood({ go }: { go: (screen: Screen) => void }) {
  const [selected, setSelected] = useState("Tranquilo")
  const [saved, setSaved] = useState(false)
  const moods = [
    { name: "Feliz", icon: "heart" as IconName, tone: "yellow" },
    { name: "Tranquilo", icon: "check" as IconName, tone: "mint" },
    { name: "Cansado", icon: "clock" as IconName, tone: "blue" },
    { name: "Triste", icon: "care" as IconName, tone: "lavender" },
    { name: "Ansioso", icon: "warning" as IconName, tone: "coral" },
    { name: "Con dolor", icon: "plus" as IconName, tone: "red" },
  ]
  return (
    <ScreenShell className="content-screen tracker-screen">
      <Header title="Estado de ánimo" back={() => go("home")} />
      <div className="tracker-hero mood-hero">
        <RobotAvatar size="medium" />
        <div>
          <span>BUDDY TE ESCUCHA</span>
          <strong>¿Cómo te sientes hoy?</strong>
          <small>No hay respuestas correctas. Cuéntame cómo estás.</small>
        </div>
      </div>
      <div className="mood-selector">
        {moods.map((mood) => (
          <button
            key={mood.name}
            className={`${mood.tone} ${
              selected === mood.name ? "selected" : ""
            }`}
            onClick={() => {
              setSelected(mood.name)
              setSaved(false)
            }}
          >
            <span>
              <Icon name={mood.icon} />
            </span>
            <strong>{mood.name}</strong>
            {selected === mood.name && (
              <i>
                <Icon name="check" size={12} />
              </i>
            )}
          </button>
        ))}
      </div>
      <label className="note-field">
        <span>
          ¿Quieres contarme algo más? <small>Opcional</small>
        </span>
        <textarea placeholder="Escribe aquí cómo fue tu día..." />
      </label>
      <Button onClick={() => setSaved(true)} icon={saved ? "check" : "heart"}>
        {saved ? "Ánimo guardado" : "Guardar cómo me siento"}
      </Button>
      <div className="history-title">
        <strong>Tu ánimo esta semana</strong>
        <button onClick={() => go("reports")}>Ver historial</button>
      </div>
      <div className="mood-history">
        {["L", "M", "X", "J", "V", "S", "D"].map((day, index) => (
          <div key={day}>
            <span
              className={
                index < 5 ? `mood-dot tone-${index}` : "mood-dot empty"
              }
            >
              {index < 5 && (
                <Icon name={index === 3 ? "clock" : "heart"} size={14} />
              )}
            </span>
            <small>{day}</small>
          </div>
        ))}
      </div>
      <button className="symptom-link" onClick={() => go("symptoms")}>
        <span>
          <Icon name="plus" />
        </span>
        <div>
          <strong>¿Tienes algún síntoma?</strong>
          <small>Regístralo para llevar un mejor seguimiento</small>
        </div>
        <Icon name="chevron" />
      </button>
    </ScreenShell>
  )
}

function Symptoms({ go }: { go: (screen: Screen) => void }) {
  const [symptom, setSymptom] = useState("Dolor de cabeza")
  const [intensity, setIntensity] = useState(2)
  const symptoms = [
    "Dolor de cabeza",
    "Mareo",
    "Náuseas",
    "Fatiga",
    "Dolor muscular",
    "Otro",
  ]
  return (
    <ScreenShell className="content-screen tracker-screen">
      <Header title="Registrar síntomas" back={() => go("mood")} />
      <div className="section-intro compact">
        <div className="page-title">¿Qué estás sintiendo?</div>
        <div className="muted">Selecciona un síntoma y su intensidad.</div>
      </div>
      <div className="symptom-chips">
        {symptoms.map((item) => (
          <button
            className={symptom === item ? "active" : ""}
            onClick={() => setSymptom(item)}
            key={item}
          >
            {item === symptom && <Icon name="check" size={14} />}
            {item}
          </button>
        ))}
      </div>
      <div className="intensity-card">
        <div>
          <strong>Intensidad</strong>
          <span>{["Leve", "Moderado", "Fuerte"][intensity - 1]}</span>
        </div>
        <div className="intensity-scale">
          {[1, 2, 3].map((level) => (
            <button
              key={level}
              className={intensity >= level ? `level-${level} active` : ""}
              onClick={() => setIntensity(level)}
            >
              <span>{level}</span>
              <small>{["Leve", "Moderado", "Fuerte"][level - 1]}</small>
            </button>
          ))}
        </div>
      </div>
      <div className="form-grid">
        <Field label="Hora" value="09:45 a. m." icon="clock" />
        <Field label="Fecha" value="Hoy" icon="calendar" />
      </div>
      <label className="note-field">
        <span>Notas</span>
        <textarea placeholder="Describe brevemente lo que sientes..." />
      </label>
      <div className="guidance-card">
        <Icon name="shield" />
        <span>
          Este registro ayuda a tu seguimiento. Si el síntoma es intenso o
          urgente, contacta a un profesional.
        </span>
      </div>
      <Button onClick={() => go("home")}>Guardar síntoma</Button>
    </ScreenShell>
  )
}

function Sleep({ go }: { go: (screen: Screen) => void }) {
  const [quality, setQuality] = useState("Buena")
  return (
    <ScreenShell className="content-screen tracker-screen">
      <Header
        title="Mi sueño"
        back={() => go("home")}
        right={
          <button className="icon-btn soft" onClick={() => go("reports")}>
            <Icon name="calendar" />
          </button>
        }
      />
      <div className="sleep-summary">
        <div className="moon-visual">
          <Icon name="clock" size={34} />
        </div>
        <div>
          <span>ANOCHE</span>
          <strong>Dormiste 7h 20m</strong>
          <small>40 min más que tu promedio</small>
        </div>
        <div className="sleep-score">
          <strong>86</strong>
          <small>Muy bien</small>
        </div>
      </div>
      <div className="sleep-times">
        <div>
          <span className="sleep-time-icon lavender">
            <Icon name="clock" />
          </span>
          <small>Hora de dormir</small>
          <strong>10:40 p. m.</strong>
        </div>
        <span className="sleep-line">
          <i />
        </span>
        <div>
          <span className="sleep-time-icon yellow">
            <Icon name="clock" />
          </span>
          <small>Hora de despertar</small>
          <strong>6:00 a. m.</strong>
        </div>
      </div>
      <div className="section-heading">
        <strong>Calidad del sueño</strong>
        <small>¿Cómo descansaste?</small>
      </div>
      <div className="quality-selector">
        {["Ligera", "Buena", "Profunda"].map((item, index) => (
          <button
            className={quality === item ? "active" : ""}
            onClick={() => setQuality(item)}
            key={item}
          >
            <span className={`quality-icon q-${index}`}>
              <Icon name={index === 0 ? "clock" : "heart"} />
            </span>
            {item}
          </button>
        ))}
      </div>
      <div className="mini-chart-card">
        <div>
          <strong>Últimos 7 días</strong>
          <small>Promedio: 7h 08m</small>
        </div>
        <div className="bar-chart">
          {[62, 78, 55, 86, 71, 91, 82].map((height, index) => (
            <span key={index}>
              <i style={{ height: `${height}%` }} />
              <small>{["L", "M", "X", "J", "V", "S", "D"][index]}</small>
            </span>
          ))}
        </div>
      </div>
      <div className="nap-card">
        <span>
          <Icon name="clock" />
        </span>
        <div>
          <strong>Siesta de hoy</strong>
          <small>Aún no has registrado una siesta</small>
        </div>
        <button>
          <Icon name="plus" />
        </button>
      </div>
      <Button onClick={() => go("home")}>Guardar registro de sueño</Button>
    </ScreenShell>
  )
}

function Sparkline({
  values,
  tone = "mint",
}: {
  values: number[]
  tone?: string
}) {
  return (
    <div className={`sparkline ${tone}`}>
      {values.map((value, index) => (
        <i key={index} style={{ height: `${value}%` }} />
      ))}
    </div>
  )
}

function Health({ go }: { go: (screen: Screen) => void }) {
  const metrics = [
    {
      label: "Presión arterial",
      value: "118/76",
      unit: "mmHg",
      icon: "heart" as IconName,
      tone: "coral",
      trend: "En rango",
      data: [40, 55, 48, 65, 58, 72, 66],
    },
    {
      label: "Glucosa",
      value: "96",
      unit: "mg/dL",
      icon: "plus" as IconName,
      tone: "blue",
      trend: "Estable",
      data: [52, 48, 63, 56, 68, 61, 64],
    },
    {
      label: "Ritmo cardiaco",
      value: "72",
      unit: "ppm",
      icon: "heart" as IconName,
      tone: "lavender",
      trend: "Normal",
      data: [35, 72, 43, 80, 48, 67, 55],
    },
    {
      label: "Oxigenación",
      value: "98",
      unit: "%",
      icon: "care" as IconName,
      tone: "mint",
      trend: "Excelente",
      data: [68, 70, 67, 75, 73, 78, 76],
    },
    {
      label: "Temperatura",
      value: "36.5",
      unit: "°C",
      icon: "warning" as IconName,
      tone: "yellow",
      trend: "Normal",
      data: [54, 56, 53, 57, 55, 56, 54],
    },
    {
      label: "Peso",
      value: "67.4",
      unit: "kg",
      icon: "user" as IconName,
      tone: "petrol",
      trend: "-0.2 kg",
      data: [75, 72, 68, 64, 62, 59, 57],
    },
  ]
  return (
    <ScreenShell className="content-screen health-screen">
      <Header
        title="Monitoreo de salud"
        back={() => go("home")}
        right={
          <button className="icon-btn mint">
            <Icon name="plus" />
          </button>
        }
      />
      <div className="health-overview">
        <div className="health-ring">
          <span>92</span>
          <small>
            Índice
            <br />
            general
          </small>
        </div>
        <div>
          <span>RESUMEN DE HOY</span>
          <strong>Todo se ve estable</strong>
          <small>Último registro hace 35 minutos</small>
        </div>
        <Icon name="check" />
      </div>
      <div className="health-grid">
        {metrics.map((metric) => (
          <button className={`health-widget ${metric.tone}`} key={metric.label}>
            <span className="widget-icon">
              <Icon name={metric.icon} />
            </span>
            <small>{metric.label}</small>
            <strong>
              {metric.value} <i>{metric.unit}</i>
            </strong>
            <Sparkline values={metric.data} tone={metric.tone} />
            <span className="widget-trend">
              <Icon name="check" size={12} />
              {metric.trend}
            </span>
          </button>
        ))}
      </div>
      <div className="hydration-card">
        <span className="water-icon">
          <Icon name="care" />
        </span>
        <div>
          <small>HIDRATACIÓN</small>
          <strong>5 de 8 vasos</strong>
          <span>
            <i />
          </span>
        </div>
        <button>
          <Icon name="plus" />
        </button>
      </div>
      <div className="guidance-card">
        <Icon name="shield" />
        <span>
          Los datos son orientativos y no sustituyen una valoración médica.
        </span>
      </div>
      <Button onClick={() => go("reports")} variant="secondary">
        Ver historial y tendencias
      </Button>
    </ScreenShell>
  )
}

function Wellness({ go }: { go: (screen: Screen) => void }) {
  const [water, setWater] = useState(5)
  const [done, setDone] = useState(["Respiración"])
  const toggle = (name: string) =>
    setDone(
      done.includes(name)
        ? done.filter((item) => item !== name)
        : [...done, name],
    )
  const habits = [
    {
      name: "Caminata suave",
      detail: "15 minutos",
      icon: "care" as IconName,
      tone: "mint",
    },
    {
      name: "Respiración",
      detail: "3 minutos",
      icon: "heart" as IconName,
      tone: "lavender",
    },
    {
      name: "Alimentación",
      detail: "Fruta con el desayuno",
      icon: "check" as IconName,
      tone: "yellow",
    },
  ]
  return (
    <ScreenShell className="content-screen with-nav wellness-screen">
      <Header
        title="Bienestar diario"
        back={() => go("home")}
        right={
          <button className="avatar-button" onClick={() => go("settings")}>
            <Avatar size="small" />
          </button>
        }
      />
      <div className="wellness-hero">
        <div>
          <span>TU PROGRESO DE HOY</span>
          <strong>¡Vas muy bien, Carmen!</strong>
          <small>{done.length + 2} de 5 pequeñas metas completadas</small>
        </div>
        <div className="goal-ring">
          <span>{(done.length + 2) * 20}%</span>
        </div>
      </div>
      <div className="hydration-widget">
        <div className="hydration-copy">
          <span className="water-icon">
            <Icon name="care" />
          </span>
          <div>
            <strong>Hidratación</strong>
            <small>{water} de 8 vasos</small>
          </div>
        </div>
        <div className="water-dots">
          {Array.from({ length: 8 }).map((_, index) => (
            <i className={index < water ? "filled" : ""} key={index} />
          ))}
        </div>
        <button onClick={() => setWater(Math.min(8, water + 1))}>
          <Icon name="plus" size={18} />
          Añadir vaso
        </button>
      </div>
      <div className="section-heading wellness-heading">
        <strong>Tu rutina de hoy</strong>
        <small>Pasos pequeños, grandes logros</small>
      </div>
      <div className="habit-list">
        {habits.map((habit) => (
          <button
            key={habit.name}
            onClick={() => toggle(habit.name)}
            className={done.includes(habit.name) ? "done" : ""}
          >
            <span className={`habit-icon ${habit.tone}`}>
              <Icon name={habit.icon} />
            </span>
            <span>
              <strong>{habit.name}</strong>
              <small>{habit.detail}</small>
            </span>
            <i>
              {done.includes(habit.name) ? (
                <Icon name="check" size={16} />
              ) : (
                <Icon name="plus" size={16} />
              )}
            </i>
          </button>
        ))}
      </div>
      <div className="achievement-card">
        <span className="achievement-mark">
          <Icon name="heart" />
        </span>
        <div>
          <small>LOGRO DEL DÍA</small>
          <strong>¡3 días cuidándote!</strong>
          <p>Tu constancia hace la diferencia.</p>
        </div>
        <RobotAvatar size="small" />
      </div>
      <button className="reports-link" onClick={() => go("reports")}>
        <Icon name="calendar" />
        <span>
          <strong>Mi historial de bienestar</strong>
          <small>Consulta avances y tendencias</small>
        </span>
        <Icon name="chevron" />
      </button>
      <BottomNav active="wellness" go={go} />
    </ScreenShell>
  )
}

function Reports({ go }: { go: (screen: Screen) => void }) {
  const [period, setPeriod] = useState("Semana")
  return (
    <ScreenShell className="content-screen reports-screen">
      <Header title="Historial y reportes" back={() => go("home")} />
      <div className="segmented">
        {["Día", "Semana", "Mes"].map((item) => (
          <button
            key={item}
            className={period === item ? "active" : ""}
            onClick={() => setPeriod(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="report-summary">
        <div>
          <small>RESUMEN SEMANAL</small>
          <strong>Una semana estable</strong>
          <p>
            Mejoraste tu descanso y mantuviste tus registros de salud al día.
          </p>
        </div>
        <div className="report-score">
          89<small>/100</small>
        </div>
      </div>
      <div className="report-card">
        <div className="report-head">
          <span className="report-icon mint">
            <Icon name="meds" />
          </span>
          <div>
            <strong>Medicamentos</strong>
            <small>Adherencia semanal</small>
          </div>
          <b>92%</b>
        </div>
        <div className="week-bars">
          {[100, 75, 100, 100, 75, 100, 100].map((value, index) => (
            <span key={index}>
              <i style={{ height: `${value}%` }} />
              <small>{["L", "M", "X", "J", "V", "S", "D"][index]}</small>
            </span>
          ))}
        </div>
      </div>
      <div className="report-card">
        <div className="report-head">
          <span className="report-icon lavender">
            <Icon name="heart" />
          </span>
          <div>
            <strong>Ánimo</strong>
            <small>Mayormente tranquilo</small>
          </div>
          <b className="stable">Estable</b>
        </div>
        <Sparkline values={[48, 65, 58, 72, 68, 80, 76]} tone="lavender" />
      </div>
      <div className="report-grid">
        <div>
          <span className="report-icon blue">
            <Icon name="clock" />
          </span>
          <small>Sueño promedio</small>
          <strong>7h 08m</strong>
          <p>+18 min esta semana</p>
        </div>
        <div>
          <span className="report-icon coral">
            <Icon name="heart" />
          </span>
          <small>Salud general</small>
          <strong>En rango</strong>
          <p>6 registros nuevos</p>
        </div>
      </div>
      <Button variant="secondary">Compartir reporte con mi cuidador</Button>
    </ScreenShell>
  )
}

function Safety({ go }: { go: (screen: Screen) => void }) {
  return (
    <ScreenShell className="content-screen">
      <Header
        title="Seguridad de medicamentos"
        back={() => go("medications")}
      />
      <div className="safety-hero">
        <div className="shield-orb">
          <Icon name="shield" size={33} />
        </div>
        <div>
          <strong>Revisión actualizada</strong>
          <span>4 medicamentos registrados</span>
        </div>
        <span className="status success">
          <Icon name="check" size={13} /> Revisado
        </span>
      </div>
      <div className="section-heading">
        <strong>Indicaciones importantes</strong>
        <small>Información para ayudarte a cuidarte mejor</small>
      </div>
      <div className="warning-list">
        <div className="warning-card attention">
          <span className="warning-icon">
            <Icon name="warning" />
          </span>
          <div>
            <span className="status attention">ATENCIÓN</span>
            <strong>Posible interacción leve</strong>
            <p>
              Amlodipino y Metformina pueden requerir seguimiento de presión.
            </p>
            <small>Consultar con el médico</small>
          </div>
        </div>
        <div className="warning-card info">
          <span className="warning-icon">
            <Icon name="care" />
          </span>
          <div>
            <span className="status info">INDICACIÓN</span>
            <strong>Tomar con alimentos</strong>
            <p>
              La Metformina se tolera mejor durante o después de una comida.
            </p>
          </div>
        </div>
        <div className="warning-card success-card">
          <span className="warning-icon">
            <Icon name="check" />
          </span>
          <div>
            <span className="status success">TODO BIEN</span>
            <strong>Sin alertas críticas</strong>
            <p>No encontramos advertencias críticas en tus medicamentos.</p>
          </div>
        </div>
      </div>
      <div className="disclaimer">
        <Icon name="shield" size={18} />
        <span>
          Esta información es orientativa y no reemplaza la evaluación de un
          profesional de la salud.
        </span>
      </div>
    </ScreenShell>
  )
}

function Caregiver({ go }: { go: (screen: Screen) => void }) {
  return (
    <ScreenShell className="content-screen caregiver-screen">
      <div className="caregiver-header">
        <div>
          <div className="eyebrow">BUDDY CUIDADOR</div>
          <div className="page-title">Panel del cuidador</div>
        </div>
        <button className="avatar-button" onClick={() => go("profile")}>
          <span className="caregiver-avatar">ML</span>
        </button>
      </div>
      <div className="segmented">
        <button className="active">Resumen</button>
        <button onClick={() => go("location")}>Ubicación</button>
      </div>
      <div className="person-card">
        <Avatar size="large" />
        <div>
          <strong>Carmen García</strong>
          <small>
            <span /> Todo en orden hoy
          </small>
          <p>Última actividad hace 8 min</p>
        </div>
        <button className="icon-btn">
          <Icon name="menu" />
        </button>
      </div>
      <div className="metric-grid">
        <button onClick={() => go("medications")}>
          <span className="metric-icon mint-icon">
            <Icon name="meds" />
          </span>
          <strong>3/4</strong>
          <small>
            Medicamentos
            <br />
            tomados
          </small>
        </button>
        <button onClick={() => go("alerts")}>
          <span className="metric-icon coral-icon">
            <Icon name="bell" />
          </span>
          <strong>1</strong>
          <small>
            Alerta
            <br />
            pendiente
          </small>
        </button>
      </div>
      <div className="care-status-row">
        <button onClick={() => go("mood")}>
          <span className="lavender">
            <Icon name="heart" />
          </span>
          <strong>Tranquila</strong>
          <small>Ánimo</small>
        </button>
        <button onClick={() => go("sleep")}>
          <span className="blue">
            <Icon name="clock" />
          </span>
          <strong>7h 20m</strong>
          <small>Sueño</small>
        </button>
        <button onClick={() => go("symptoms")}>
          <span className="yellow">
            <Icon name="warning" />
          </span>
          <strong>1 leve</strong>
          <small>Síntoma</small>
        </button>
      </div>
      <button className="location-preview" onClick={() => go("location")}>
        <span className="map-lines" />
        <span className="map-pin">
          <Avatar size="small" />
        </span>
        <span className="map-caption">
          <strong>
            <Icon name="location" size={16} /> En casa
          </strong>
          <small>Actualizado hace 8 min</small>
        </span>
        <span className="map-link">
          Ver mapa <Icon name="chevron" size={16} />
        </span>
      </button>
      <div className="quick-actions">
        <Button onClick={() => go("location")} icon="phone">
          Llamar
        </Button>
        <Button variant="secondary" icon="chat">
          Mensaje
        </Button>
      </div>
      <div className="activity-head">
        <strong>Actividad de hoy</strong>
        <button onClick={() => go("reports")}>Ver reporte</button>
      </div>
      <div className="wellness-grid">
        <div>
          <span>
            <Icon name="care" />
          </span>
          <strong>1,250</strong>
          <small>Pasos</small>
        </div>
        <div>
          <span>
            <Icon name="clock" />
          </span>
          <strong>7h 20m</strong>
          <small>Sueño</small>
        </div>
        <div>
          <span>
            <Icon name="heart" />
          </span>
          <strong>Excelente</strong>
          <small>Ánimo</small>
        </div>
      </div>
    </ScreenShell>
  )
}

function Location({ go }: { go: (screen: Screen) => void }) {
  const [tab, setTab] = useState("Ubicación")
  return (
    <ScreenShell className="content-screen location-screen">
      <Header title="Ubicación y bienestar" back={() => go("caregiver")} />
      <div className="segmented">
        <button
          className={tab === "Ubicación" ? "active" : ""}
          onClick={() => setTab("Ubicación")}
        >
          Ubicación
        </button>
        <button
          className={tab === "Bienestar" ? "active" : ""}
          onClick={() => setTab("Bienestar")}
        >
          Bienestar
        </button>
      </div>
      {tab === "Ubicación" ? (
        <>
          <div className="full-map">
            <span className="street s1" />
            <span className="street s2" />
            <span className="street s3" />
            <span className="street s4" />
            <span className="park" />
            <div className="user-pin">
              <Avatar />
              <span />
            </div>
            <span className="map-place home-place">Casa de Carmen</span>
            <span className="map-place clinic-place">Parque Central</span>
            <button className="locate-btn">
              <Icon name="location" />
            </button>
          </div>
          <div className="sharing-card">
            <span className="sharing-icon">
              <Icon name="shield" />
            </span>
            <div>
              <strong>Ubicación compartida activa</strong>
              <small>Actualizada hoy, 9:42 a. m.</small>
            </div>
            <span className="live-dot">EN VIVO</span>
          </div>
          <div className="address-card">
            <span>
              <Icon name="home" />
            </span>
            <div>
              <small>UBICACIÓN ACTUAL</small>
              <strong>En casa</strong>
              <p>Av. de la Paz 142, Madrid</p>
            </div>
          </div>
        </>
      ) : (
        <div className="wellbeing-detail">
          <div className="wellness-score">
            <span>92</span>
            <small>
              Bienestar
              <br />
              general
            </small>
          </div>
          <div className="page-title">Carmen está teniendo un buen día</div>
          <div className="muted">
            Sus rutinas de descanso, movimiento y medicación se mantienen
            estables.
          </div>
          <div className="wellness-grid large">
            <div>
              <span>
                <Icon name="care" />
              </span>
              <strong>1,250</strong>
              <small>Pasos</small>
            </div>
            <div>
              <span>
                <Icon name="clock" />
              </span>
              <strong>7h 20m</strong>
              <small>Sueño</small>
            </div>
            <div>
              <span>
                <Icon name="heart" />
              </span>
              <strong>Excelente</strong>
              <small>Ánimo</small>
            </div>
          </div>
        </div>
      )}
      <div className="quick-actions bottom-actions">
        <Button icon="phone">Llamar ahora</Button>
        <Button variant="secondary" icon="chat">
          Enviar mensaje
        </Button>
      </div>
    </ScreenShell>
  )
}

function Alerts({ go }: { go: (screen: Screen) => void }) {
  const events = [
    {
      icon: "bell" as IconName,
      title: "Medicamento no confirmado",
      text: "Metformina · 2:00 p. m.",
      time: "Hace 18 min",
      status: "Pendiente",
      tone: "coral",
    },
    {
      icon: "warning" as IconName,
      title: "Síntoma reportado",
      text: "Dolor de cabeza · Intensidad leve",
      time: "Hoy, 12:35 p. m.",
      status: "Atendida",
      tone: "yellow",
    },
    {
      icon: "check" as IconName,
      title: "Seguimiento realizado",
      text: "Amlodipino confirmado",
      time: "Hoy, 8:12 a. m.",
      status: "Resuelto",
      tone: "mint",
    },
    {
      icon: "heart" as IconName,
      title: "Cambio de ánimo",
      text: "Carmen se siente tranquila",
      time: "Hoy, 8:05 a. m.",
      status: "Resuelto",
      tone: "mint",
    },
    {
      icon: "warning" as IconName,
      title: "Presión por registrar",
      text: "Registro semanal pendiente",
      time: "Ayer, 6:00 p. m.",
      status: "Importante",
      tone: "yellow",
    },
  ]
  return (
    <ScreenShell className="content-screen">
      <Header
        title="Alertas y seguimiento"
        back={() => go("caregiver")}
        right={
          <button className="icon-btn soft">
            <Icon name="search" />
          </button>
        }
      />
      <div className="alert-summary">
        <div>
          <span>1</span>
          <small>Pendiente</small>
        </div>
        <div>
          <span>1</span>
          <small>Importante</small>
        </div>
        <div>
          <span>2</span>
          <small>Resueltos</small>
        </div>
      </div>
      <div className="section-heading">
        <strong>Actividad reciente</strong>
        <small>Hoy, 10 de marzo</small>
      </div>
      <div className="timeline">
        {events.map((event, index) => (
          <div className="event" key={event.title}>
            <span className={`event-icon ${event.tone}`}>
              <Icon name={event.icon} />
            </span>
            {index < events.length - 1 && <i />}
            <div>
              <strong>{event.title}</strong>
              <p>{event.text}</p>
              <small>{event.time}</small>
            </div>
            <span className={`status ${event.tone}`}>{event.status}</span>
          </div>
        ))}
      </div>
      <Button variant="secondary" onClick={() => go("caregiver")}>
        Volver al panel
      </Button>
    </ScreenShell>
  )
}

function Settings({ go }: { go: (screen: Screen) => void }) {
  const groups = [
    [
      {
        icon: "user" as IconName,
        title: "Datos personales",
        sub: "Nombre, edad e información básica",
      },
      {
        icon: "care" as IconName,
        title: "Contactos autorizados",
        sub: "2 personas pueden acompañarte",
      },
    ],
    [
      {
        icon: "shield" as IconName,
        title: "Permisos y privacidad",
        sub: "Ubicación, datos y seguridad",
      },
      {
        icon: "bell" as IconName,
        title: "Notificaciones",
        sub: "Recordatorios y alertas",
      },
    ],
    [
      {
        icon: "heart" as IconName,
        title: "Accesibilidad",
        sub: "Texto grande, voz y contraste",
      },
      {
        icon: "warning" as IconName,
        title: "Configuración de emergencia",
        sub: "Contactos y protocolo de ayuda",
      },
    ],
  ]
  return (
    <ScreenShell className="content-screen settings-screen">
      <Header title="Perfil y configuración" back={() => go("home")} />
      <div className="profile-summary">
        <div className="avatar-wrap">
          <Avatar size="large" />
          <button>
            <Icon name="camera" size={15} />
          </button>
        </div>
        <div>
          <strong>Carmen García</strong>
          <span>Adulto mayor</span>
          <small>Miembro desde marzo de 2025</small>
        </div>
      </div>
      {groups.map((group, i) => (
        <div className="settings-group" key={i}>
          {group.map((item) => (
            <button key={item.title}>
              <span className="settings-icon">
                <Icon name={item.icon} />
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.sub}</small>
              </span>
              <Icon name="chevron" size={20} />
            </button>
          ))}
        </div>
      ))}
      <button className="switch-profile" onClick={() => go("profile")}>
        <Icon name="care" />
        <span>
          <strong>Cambiar tipo de perfil</strong>
          <small>Entrar como familiar o cuidador</small>
        </span>
        <Icon name="chevron" />
      </button>
      <Button variant="ghost" className="logout">
        Cerrar sesión
      </Button>
      <div className="version">BUDDY versión 1.0 · Siempre contigo</div>
    </ScreenShell>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("welcome")
  const go = (next: Screen) => {
    setScreen(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const screens: Record<Screen, ReactNode> = {
    welcome: <Welcome go={go} />,
    onboarding: <Onboarding go={go} />,
    profile: <ProfileChoice go={go} />,
    home: <Home go={go} />,
    medications: <Medications go={go} />,
    "add-medication": <AddMedication go={go} />,
    reminder: <Reminder go={go} />,
    mood: <Mood go={go} />,
    symptoms: <Symptoms go={go} />,
    sleep: <Sleep go={go} />,
    health: <Health go={go} />,
    chat: <Chat go={go} />,
    wellness: <Wellness go={go} />,
    safety: <Safety go={go} />,
    caregiver: <Caregiver go={go} />,
    location: <Location go={go} />,
    alerts: <Alerts go={go} />,
    reports: <Reports go={go} />,
    settings: <Settings go={go} />,
  }
  return (
    <main className="app-stage">
      <div className="device-frame">{screens[screen]}</div>
    </main>
  )
}
