import React from "react";
import {
  Briefcase,
  Calendar,
  Users,
  AlertCircle,
  Gavel,
  Clock,
  ArrowLeft,
  CheckCircle2,
  TrendingUp,
  Scale,
  Plus,
} from "lucide-react";
import { useData } from "../context/DataContext";
import { CASE_TYPES, CASE_STATUSES } from "../lib/supabase";

export default function DashboardPage({ setActiveTab, onOpenQuickAction }) {
  const { cases, clients } = useData();

  const activeCases = cases.filter((c) => !c.is_archived);
  const todayStr = new Date().toISOString().split("T")[0];
  const todaySessions = cases.filter(
    (c) => c.next_session_date && c.next_session_date.startsWith(todayStr),
  );

  // Debtor clients count
  const debtorClients = clients.filter((c) => c.financial_balance < 0);

  // Urgent hearings (next 7 days)
  const upcomingCases = activeCases
    .filter((c) => c.next_session_date && c.next_session_date >= todayStr)
    .sort(
      (a, b) => new Date(a.next_session_date) - new Date(b.next_session_date),
    )
    .slice(0, 6);

  // Recent judgments / settled
  const recentRulings = cases
    .filter(
      (c) =>
        c.ruling_text ||
        c.status === "finalJudgment" ||
        c.status === "preliminaryJudgment",
    )
    .slice(0, 5);

  return (
    <div className="page-wrapper">
      {/* Top Banner */}
      <div className="dashboard-banner">
        <div className="banner-content">
          <span className="banner-badge">
            <Scale size={15} />
            أجندة محاكم دمياط
          </span>
          <h1 className="banner-title">لو عندك 30 قضية والي باشا يروحك بالعربية</h1>
          <p className="banner-desc">
            مرحباً بك، لديك{' '}
            <strong className="banner-highlight">
              {todaySessions.length} جلسات
            </strong>{' '}
            اليوم، و{' '}
            <strong className="banner-highlight">
              {activeCases.length} قضية متداولة
            </strong>
            .
          </p>
        </div>

        <div className="banner-actions">
          <button className="btn btn-gold" onClick={onOpenQuickAction}>
            <Plus size={18} />
            <span>إضافة دعوى / جلسة</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        {/* Card 1: Active Cases */}
        <div className="card kpi-card" onClick={() => setActiveTab("cases")}>
          <div className="kpi-icon icon-primary">
            <Briefcase size={26} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">القضايا المتداولة</span>
            <h3 className="kpi-value">{activeCases.length}</h3>
          </div>
        </div>

        {/* Card 2: Today Sessions */}
        <div className="card kpi-card" onClick={() => setActiveTab("agenda")}>
          <div className="kpi-icon icon-warning">
            <Calendar size={26} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">جلسات اليوم</span>
            <h3 className="kpi-value">{todaySessions.length}</h3>
          </div>
        </div>

        {/* Card 3: Clients */}
        <div className="card kpi-card" onClick={() => setActiveTab("clients")}>
          <div className="kpi-icon icon-success">
            <Users size={26} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">سجل الموكلين</span>
            <h3 className="kpi-value">{clients.length}</h3>
          </div>
        </div>

        {/* Card 4: Debtor Clients */}
        <div className="card kpi-card" onClick={() => setActiveTab("clients")}>
          <div className="kpi-icon icon-danger">
            <AlertCircle size={26} />
          </div>
          <div className="kpi-data">
            <span className="kpi-label">مستحقات وأتعاب</span>
            <h3 className="kpi-value">{debtorClients.length}</h3>
          </div>
        </div>
      </div>

      {/* Main Grid: Upcoming Sessions & Recent Rulings */}
      <div className="dashboard-split-grid">
        {/* Urgent Hearings Roll */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <Clock size={18} color="var(--primary-600)" />
              <span>أقرب الجلسات القادمة بالمحاكم</span>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => setActiveTab("agenda")}
              style={{
                fontSize: "0.82rem",
                padding: "0.35rem 0.75rem",
                minHeight: "auto",
              }}
            >
              عرض الأجندة
              <ArrowLeft size={14} />
            </button>
          </div>

          {upcomingCases.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "2.5rem 1rem",
                color: "var(--text-muted)",
              }}
            >
              <CheckCircle2
                size={36}
                style={{
                  margin: "0 auto 0.6rem",
                  color: "var(--status-active)",
                }}
              />
              <p style={{ fontSize: "0.9rem" }}>
                لا توجد جلسات محددة خلال الأيام القادمة.
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>تاريخ الجلسة</th>
                    <th>رقم الدعوى</th>
                    <th>المحكمة والقاعة</th>
                    <th>الموضوع والخصوم</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingCases.map((c) => {
                    const st = CASE_STATUSES[c.status] || CASE_STATUSES.active;
                    return (
                      <tr key={c.id}>
                        <td
                          style={{
                            fontWeight: "700",
                            color: "var(--primary-700)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.next_session_date
                            ? new Date(c.next_session_date).toLocaleDateString(
                              "ar-EG",
                              {
                                weekday: "short",
                                month: "numeric",
                                day: "numeric",
                              },
                            )
                            : "—"}
                        </td>
                        <td>
                          <strong>{c.case_number}</strong> / {c.case_year}
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            {CASE_TYPES[c.case_type] || c.case_type}
                          </div>
                        </td>
                        <td>
                          <div>{c.court_name}</div>
                          {c.court_room && (
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              قاعة: {c.court_room}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontWeight: "600" }}>
                            {c.case_title || c.plaintiff_name}
                          </div>
                          <div
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            ضد: {c.defendant_name}
                          </div>
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{ background: st.bg, color: st.color }}
                          >
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Side Panel: Recent Rulings & Law Office Distribution */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}
        >
          {/* Recent Rulings */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Gavel size={18} color="var(--accent-gold)" />
                <span>آخر الأحكام والقرارات</span>
              </div>
            </div>

            {recentRulings.length === 0 ? (
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.85rem",
                  textAlign: "center",
                  padding: "1rem 0",
                }}
              >
                لم يتم تسجيل أحكام نهائية مؤخراً.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {recentRulings.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: "0.75rem",
                      background: "var(--bg-card-subtle)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.25rem",
                      }}
                    >
                      <strong style={{ fontSize: "0.85rem" }}>
                        دعوى {r.case_number}/{r.case_year}
                      </strong>
                      <span
                        className="badge"
                        style={{
                          background: "var(--status-judgment-bg)",
                          color: "var(--status-judgment)",
                          fontSize: "0.7rem",
                        }}
                      >
                        {r.status === "finalJudgment"
                          ? "حكم نهائي"
                          : "قرار جلسة"}
                      </span>
                    </div>
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-main)",
                        lineBreak: "anywhere",
                      }}
                    >
                      {r.ruling_text || r.notes || "تم إصدار الحكم"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Action Box */}
          <div
            className="card"
            style={{
              background:
                "linear-gradient(135deg, var(--bg-card), var(--primary-50))",
            }}
          >
            <h4 style={{ marginBottom: "0.4rem", fontSize: "0.95rem" }}>
              طباعة رول الجلسة اليومي
            </h4>
            <p
              style={{
                fontSize: "0.82rem",
                color: "var(--text-muted)",
                marginBottom: "0.9rem",
              }}
            >
              تجهيز وطباعة رول جلسات اليوم لحضوره أمام الدائرة القضائية.
            </p>
            <button
              className="btn btn-secondary"
              style={{ width: "100%", fontSize: "0.85rem" }}
              onClick={() => setActiveTab("agenda")}
            >
              الانتقال إلى رول الجلسات
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
