/* empty css                                 */
import { c as createComponent, r as renderComponent, a as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_bED4jumr.mjs';
import { u as useSubscription, a as useAuth, b as useCredit, F as FREE_PLAN, L as LemonsqueezyService, S as SUBSCRIPTION_PLANS, c as LemonsqueezyError, A as AuthProvider, C as CreditProvider, $ as $$Layout } from '../chunks/Layout_DhNej8iM.mjs';
import { $ as $$Container } from '../chunks/container_CSdxKEov.mjs';
import { $ as $$Icon } from '../chunks/footer_CgJVMux7.mjs';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useState, useEffect } from 'react';
export { renderers } from '../renderers.mjs';

const __vite_import_meta_env__ = {"ASSETS_PREFIX": undefined, "BASE_URL": "/", "DEV": false, "MODE": "production", "PROD": true, "SITE": "https://describemusic.net", "SSR": true, "VITE_CLOUD_FUNCTIONS_URL": "https://us-central1-describe-music.cloudfunctions.net", "VITE_DEVICE_FINGERPRINT_SALT": "describe-music-salt-2025-x9k2m8n4p7q1", "VITE_LEMONSQUEEZY_API_KEY": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NGQ1OWNlZi1kYmI4LTRlYTUtYjE3OC1kMjU0MGZjZDY5MTkiLCJqdGkiOiJjZWY4MDU1Y2E2NzI4YjM3NzAxMTU5MzEwYzkzNmQ0YjA2OGI3OWQ1MDFkODNhYTAxYjAyN2I3N2RjYjkzYTBlNWVmMWM3YWMzZjA0ODBkYyIsImlhdCI6MTc1ODIxNDU0Ny43NTY3OTYsIm5iZiI6MTc1ODIxNDU0Ny43NTY3OTksImV4cCI6MjA3Mzc0NzM0Ny43NDM0NCwic3ViIjoiMTkxNDAxMSIsInNjb3BlcyI6W119.as4QEOlT0uK1bOQC8C464bjvdgH4Icsf0MZMLLps4L2aVPnnVdqInbQYQG-x_PGJwY2qPdugjm1zPorVEFDdyboqMJKWLshEA-j8mXbcZeSu91u05YKKT5vE1ekZTvDrvMN8QAtQNvJ6mZLqWlpasHDOdbZYHM9uwjSYa4-zRMYbjVvEHtB0tJtRF1U8NxlUGnRkGmqWLITx-b-xb5XNjF2Pe-Y85SJJhyU0Sf0K1nfjWvKNebzYoMfwuCHXUdEjVsJvLcrZwNuLRO47YOIGwXJISQa2mqAx2PqONNs37QKz4ACWy6mPSRaz59XhTZueIHz8rqMn5adAQ6oApaEMGvcVpToAGfZknIqKpm5nt0JakFTFCEfGfKDGskpsDDXIyyxaUhVRF87xXNkM7mP7PXRcW4BsJ3EM1H_nj7VzQ194JUFDISc-nQuIefQDnTIShYLKCaMbAfuo_J6GfHUYGrEO11ryljU5q95_Mj5M6ztdjuPDKHkUCURDd7d2rtpX", "VITE_LEMONSQUEEZY_API_KEY_PART1": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NGQ1OWNlZi1kYmI4LTRlYTUtYjE3OC1kMjU0MGZjZDY5MTkiLCJqdGkiOiJjZWY4MDU1Y2E2NzI4YjM3NzAxMTU5MzEwYzkzNmQ0YjA2OGI3OWQ1MDFkODNhYTAxYjAyN2I3N2RjYjkzYTBlNWVmMWM3YWMzZjA0ODBkYyIsImlhdCI6MTc1ODIxNDU0Ny43NTY3OTYsIm5iZiI6MTc1ODIxNDU0Ny43NTY3OTksImV4cCI6MjA3Mzc0NzM0Ny43NDM0NCwic3ViIjoiMTkxNDAxMSIsInNjb3BlcyI6W119.as4QEOlT0uK1bOQC8C464bjvdgH4Icsf0MZMLLps4L2aVPnnVdqInbQYQG-x_PGJwY2qPdugjm1zPorVEFDdyboqMJKWLshEA-j8mXbcZeSu91u05YKKT5vE1ekZTvDrvMN8QAtQNvJ6mZLqWlpasHDOdbZYHM9uwjSYa4-zRMYbjVvEHtB0tJtRF1U8NxlUGnRkGmqWLITx-b-xb5XNjF2Pe-Y85SJJhyU0Sf0K1nfjWvKNebzYoMfwuCHXUdEjVsJvLcrZwNuLRO47YOIGwXJISQa2mqAx2PqONNs37QKz4ACWy6mPSRaz59XhTZueIHz8rqMn5adAQ6oApaEMGvcVpToAGfZknIqKpm5nt0JakFTFCEfGfKDGskpsDDXIyyxaUhVRF87xXNkM7mP7PXRcW4BsJ3EM1H_nj7VzQ194JUFDISc-nQuIefQDnTIShYLKCaMbAfuo_J6GfHUYGrEO11ryljU5q95_Mj5M6ztdjuPDKHkUCURDd7d2rtpX", "VITE_LEMONSQUEEZY_BASIC_VARIANT_ID": "999961", "VITE_LEMONSQUEEZY_PREMIUM_VARIANT_ID": "999967", "VITE_LEMONSQUEEZY_PRO_VARIANT_ID": "999967", "VITE_LEMONSQUEEZY_STORE_ID": "76046", "VITE_LEMONSQUEEZY_WEBHOOK_SECRET": "your-webhook-secret-here", "VITE_MONTHLY_LIMIT": "10", "VITE_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWdyb2V5dHNidXJsZ21veGNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MzUwMjQsImV4cCI6MjA3MzUxMTAyNH0.z6T4B5HtUuLoQD-hmSNJEWCmoXCM0_pNoy5MlaC49ok", "VITE_SUPABASE_URL": "https://fsmgroeytsburlgmoxcj.supabase.co", "VITE_TRIAL_LIMIT": "5", "VITE_USER_NODE_ENV": "development"};
const ENV = {
  LEMONSQUEEZY_API_KEY: (() => {
    const envApiKey = Object.assign(__vite_import_meta_env__, { _: process.env._ }).VITE_LEMONSQUEEZY_API_KEY;
    if (!envApiKey) {
      throw new Error("VITE_LEMONSQUEEZY_API_KEY environment variable is required");
    }
    return envApiKey;
  })(),
  LEMONSQUEEZY_STORE_ID: Object.assign(__vite_import_meta_env__, { _: process.env._ }).VITE_LEMONSQUEEZY_STORE_ID || "76046",
  LEMONSQUEEZY_BASIC_VARIANT_ID: Object.assign(__vite_import_meta_env__, { _: process.env._ }).VITE_LEMONSQUEEZY_BASIC_VARIANT_ID || "999961",
  LEMONSQUEEZY_PRO_VARIANT_ID: Object.assign(__vite_import_meta_env__, { _: process.env._ }).VITE_LEMONSQUEEZY_PRO_VARIANT_ID || "999967",
  LEMONSQUEEZY_PREMIUM_VARIANT_ID: Object.assign(__vite_import_meta_env__, { _: process.env._ }).VITE_LEMONSQUEEZY_PREMIUM_VARIANT_ID || "999967"
};
function isLemonsqueezyConfigured() {
  return !!(ENV.LEMONSQUEEZY_API_KEY && ENV.LEMONSQUEEZY_STORE_ID);
}

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger",
  loading = false
}) {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = "hidden";
    } else {
      const timer = setTimeout(() => setIsVisible(false), 150);
      document.body.style.overflow = "unset";
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      onClose();
    }
    if (e.key === "Enter" && !loading) {
      onConfirm();
    }
  };
  const getTypeStyles = () => {
    switch (type) {
      case "danger":
        return {
          icon: /* @__PURE__ */ jsx("svg", { className: "w-6 h-6 text-red-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" }) }),
          iconBg: "bg-red-500/20",
          confirmButton: "bg-red-600 hover:bg-red-700 focus:ring-red-500"
        };
      case "warning":
        return {
          icon: /* @__PURE__ */ jsx("svg", { className: "w-6 h-6 text-orange-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }),
          iconBg: "bg-orange-500/20",
          confirmButton: "bg-orange-600 hover:bg-orange-700 focus:ring-orange-500"
        };
      case "info":
        return {
          icon: /* @__PURE__ */ jsx("svg", { className: "w-6 h-6 text-blue-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }),
          iconBg: "bg-blue-500/20",
          confirmButton: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
        };
    }
  };
  const typeStyles = getTypeStyles();
  if (!isVisible) return null;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      className: `fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-150 ${isOpen ? "opacity-100" : "opacity-0"}`,
      onClick: handleBackdropClick,
      onKeyDown: handleKeyDown,
      tabIndex: -1,
      children: [
        /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-black/50 backdrop-blur-sm" }),
        /* @__PURE__ */ jsx(
          "div",
          {
            className: `relative w-full max-w-md transform transition-all duration-150 ${isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"}`,
            children: /* @__PURE__ */ jsxs("div", { className: "bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden", children: [
              /* @__PURE__ */ jsx("div", { className: "p-6 pb-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4", children: [
                /* @__PURE__ */ jsx("div", { className: `flex-shrink-0 w-12 h-12 rounded-full ${typeStyles.iconBg} flex items-center justify-center`, children: typeStyles.icon }),
                /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold text-white mb-2", children: title }),
                  /* @__PURE__ */ jsx("p", { className: "text-slate-300 text-sm leading-relaxed", children: message })
                ] })
              ] }) }),
              /* @__PURE__ */ jsxs("div", { className: "px-6 py-4 bg-slate-900/50 flex gap-3 justify-end", children: [
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: onClose,
                    disabled: loading,
                    className: "px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
                    children: cancelText
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    onClick: onConfirm,
                    disabled: loading,
                    className: `px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 ${typeStyles.confirmButton} flex items-center gap-2`,
                    children: [
                      loading && /* @__PURE__ */ jsx("div", { className: "w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" }),
                      confirmText
                    ]
                  }
                )
              ] })
            ] })
          }
        )
      ]
    }
  );
}

function SubscriptionManagement() {
  const {
    subscription,
    isActive,
    isLoading,
    error,
    needsRenewal,
    daysUntilRenewal,
    cancelSubscription,
    getCustomerPortalUrl,
    refreshSubscription,
    formatStatus,
    canModifySubscription
  } = useSubscription();
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const handleManageSubscription = async () => {
    try {
      setActionLoading("manage");
      setActionError(null);
      const portalUrl = await getCustomerPortalUrl();
      if (portalUrl) {
        window.open(portalUrl, "_blank");
      } else {
        setActionError("Unable to access customer portal");
      }
    } catch (error2) {
      setActionError(error2 instanceof Error ? error2.message : "Unknown error");
    } finally {
      setActionLoading(null);
    }
  };
  const handleCancelSubscription = () => {
    setShowCancelDialog(true);
  };
  const confirmCancelSubscription = async () => {
    try {
      setActionLoading("cancel");
      setActionError(null);
      setShowCancelDialog(false);
      await cancelSubscription();
      setActionError(null);
    } catch (error2) {
      setActionError(error2 instanceof Error ? error2.message : "Failed to cancel subscription");
    } finally {
      setActionLoading(null);
    }
  };
  const handleRefreshStatus = async () => {
    try {
      setActionLoading("refresh");
      setActionError(null);
      await refreshSubscription();
    } catch (error2) {
      setActionError("Failed to refresh subscription status");
    } finally {
      setActionLoading(null);
    }
  };
  if (isLoading) {
    return /* @__PURE__ */ jsx("div", { className: "max-w-4xl mx-auto p-8 bg-slate-800/30 rounded-2xl border border-slate-700", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center py-12", children: [
      /* @__PURE__ */ jsx("div", { className: "w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" }),
      /* @__PURE__ */ jsx("span", { className: "ml-3 text-slate-300", children: "Loading subscription information..." })
    ] }) });
  }
  if (error) {
    return /* @__PURE__ */ jsx("div", { className: "max-w-4xl mx-auto p-8 bg-red-500/10 border border-red-500/30 rounded-2xl", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4", children: [
      /* @__PURE__ */ jsx("svg", { className: "w-6 h-6 text-red-400 mt-1 flex-shrink-0", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h3", { className: "text-red-300 font-medium mb-2", children: "Subscription Error" }),
        /* @__PURE__ */ jsx("p", { className: "text-red-200 text-sm mb-4", children: error }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleRefreshStatus,
            disabled: actionLoading === "refresh",
            className: "px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors duration-200 disabled:opacity-50",
            children: actionLoading === "refresh" ? "Refreshing..." : "Retry"
          }
        )
      ] })
    ] }) });
  }
  if (!subscription || !isActive) {
    return null;
  }
  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "text-green-400 bg-green-500/20 border-green-500/30";
      case "on_trial":
        return "text-blue-400 bg-blue-500/20 border-blue-500/30";
      case "cancelled":
        return "text-orange-400 bg-orange-500/20 border-orange-500/30";
      case "past_due":
      case "unpaid":
        return "text-red-400 bg-red-500/20 border-red-500/30";
      default:
        return "text-slate-400 bg-slate-500/20 border-slate-500/30";
    }
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs("div", { className: "max-w-4xl mx-auto space-y-6", children: [
      needsRenewal && daysUntilRenewal && /* @__PURE__ */ jsx("div", { className: "p-6 bg-orange-500/10 border border-orange-500/30 rounded-xl", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4", children: [
        /* @__PURE__ */ jsx("svg", { className: "w-6 h-6 text-orange-400 mt-1 flex-shrink-0", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { className: "text-orange-300 font-medium mb-2", children: "Subscription Renewal Reminder" }),
          /* @__PURE__ */ jsxs("p", { className: "text-orange-200 text-sm", children: [
            "Your subscription will renew in ",
            daysUntilRenewal,
            " day",
            daysUntilRenewal !== 1 ? "s" : "",
            ". Make sure your payment method is up to date."
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "p-8 bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-violet-500/30 rounded-2xl", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between mb-6", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-white mb-2", children: "Current Subscription" }),
            /* @__PURE__ */ jsx("p", { className: "text-slate-300", children: "Manage your subscription and billing information" })
          ] }),
          /* @__PURE__ */ jsx("div", { className: `px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(subscription.status)}`, children: formatStatus(subscription.status) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid md:grid-cols-2 gap-6 mb-8", children: [
          /* @__PURE__ */ jsx("div", { className: "space-y-4", children: /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold text-white mb-3", children: "Subscription Details" }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-2 text-sm", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
                /* @__PURE__ */ jsx("span", { className: "text-slate-400", children: "Plan:" }),
                /* @__PURE__ */ jsx("span", { className: "text-white font-medium", children: subscription.productName })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
                /* @__PURE__ */ jsx("span", { className: "text-slate-400", children: "Variant:" }),
                /* @__PURE__ */ jsx("span", { className: "text-white", children: subscription.variantName })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
                /* @__PURE__ */ jsx("span", { className: "text-slate-400", children: "Credits:" }),
                /* @__PURE__ */ jsxs("span", { className: "text-violet-400 font-medium", children: [
                  subscription.credits.toLocaleString(),
                  "/month"
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
                /* @__PURE__ */ jsx("span", { className: "text-slate-400", children: "Status:" }),
                /* @__PURE__ */ jsx("span", { className: "text-white", children: subscription.statusFormatted })
              ] })
            ] })
          ] }) }),
          /* @__PURE__ */ jsx("div", { className: "space-y-4", children: /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold text-white mb-3", children: "Billing Information" }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-2 text-sm", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
                /* @__PURE__ */ jsx("span", { className: "text-slate-400", children: "Next Renewal:" }),
                /* @__PURE__ */ jsx("span", { className: "text-white", children: subscription.renewsAt.toLocaleDateString() })
              ] }),
              subscription.endsAt && /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
                /* @__PURE__ */ jsx("span", { className: "text-slate-400", children: "Ends At:" }),
                /* @__PURE__ */ jsx("span", { className: "text-orange-400", children: subscription.endsAt.toLocaleDateString() })
              ] }),
              subscription.trialEndsAt && /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
                /* @__PURE__ */ jsx("span", { className: "text-slate-400", children: "Trial Ends:" }),
                /* @__PURE__ */ jsx("span", { className: "text-blue-400", children: subscription.trialEndsAt.toLocaleDateString() })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
                /* @__PURE__ */ jsx("span", { className: "text-slate-400", children: "Payment Method:" }),
                /* @__PURE__ */ jsxs("span", { className: "text-white", children: [
                  subscription.cardBrand,
                  " •••• ",
                  subscription.cardLastFour
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-between", children: [
                /* @__PURE__ */ jsx("span", { className: "text-slate-400", children: "Auto-Renewal:" }),
                /* @__PURE__ */ jsx("span", { className: subscription.cancelled ? "text-orange-400" : "text-green-400", children: subscription.cancelled ? "Cancelled" : "Active" })
              ] })
            ] })
          ] }) })
        ] }),
        actionError && /* @__PURE__ */ jsx("div", { className: "mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
          /* @__PURE__ */ jsx("svg", { className: "w-5 h-5 text-red-400 mt-0.5 flex-shrink-0", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-red-300 font-medium", children: "Action Failed" }),
            /* @__PURE__ */ jsx("p", { className: "text-red-200 text-sm mt-1", children: actionError }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => setActionError(null),
                className: "text-red-300 hover:text-red-200 text-sm mt-2 underline",
                children: "Dismiss"
              }
            )
          ] })
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-4", children: [
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: handleManageSubscription,
              disabled: !!actionLoading,
              className: "flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-xl font-semibold hover:from-violet-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed",
              children: [
                actionLoading === "manage" && /* @__PURE__ */ jsx("div", { className: "w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" }),
                /* @__PURE__ */ jsxs("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: [
                  /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" }),
                  /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" })
                ] }),
                actionLoading === "manage" ? "Opening..." : "Update Payment & Billing"
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: handleRefreshStatus,
              disabled: !!actionLoading,
              className: "flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-xl font-semibold hover:bg-slate-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed",
              children: [
                actionLoading === "refresh" && /* @__PURE__ */ jsx("div", { className: "w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" }),
                /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" }) }),
                actionLoading === "refresh" ? "Refreshing..." : "Refresh Status"
              ]
            }
          ),
          canModifySubscription(subscription.status) && !subscription.cancelled && /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: handleCancelSubscription,
              disabled: !!actionLoading,
              className: "flex items-center gap-2 px-6 py-3 bg-red-600/20 text-red-300 border border-red-500/30 rounded-xl font-semibold hover:bg-red-600/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed",
              children: [
                actionLoading === "cancel" && /* @__PURE__ */ jsx("div", { className: "w-4 h-4 border-2 border-red-300/30 border-t-red-300 rounded-full animate-spin" }),
                /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }),
                actionLoading === "cancel" ? "Cancelling..." : "Cancel Subscription"
              ]
            }
          )
        ] }),
        subscription.cancelled && subscription.endsAt && /* @__PURE__ */ jsx("div", { className: "mt-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
          /* @__PURE__ */ jsx("svg", { className: "w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-orange-300 font-medium", children: "Subscription Cancelled" }),
            /* @__PURE__ */ jsxs("p", { className: "text-orange-200 text-sm mt-1", children: [
              "Your subscription has been cancelled and will end on ",
              subscription.endsAt.toLocaleDateString(),
              ". You will retain access to premium features until then."
            ] })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4", children: [
        /* @__PURE__ */ jsx("svg", { className: "w-6 h-6 text-blue-400 mt-1 flex-shrink-0", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-blue-400 font-medium mb-2", children: "Available Actions" }),
          /* @__PURE__ */ jsxs("ul", { className: "text-blue-300 space-y-1 text-sm", children: [
            /* @__PURE__ */ jsxs("li", { children: [
              "• ",
              /* @__PURE__ */ jsx("strong", { children: '"Update Payment & Billing"' }),
              " - Change payment methods, update billing address, download invoices"
            ] }),
            /* @__PURE__ */ jsxs("li", { children: [
              "• ",
              /* @__PURE__ */ jsx("strong", { children: '"Refresh Status"' }),
              " - Get the latest subscription information from our servers"
            ] }),
            /* @__PURE__ */ jsxs("li", { children: [
              "• ",
              /* @__PURE__ */ jsx("strong", { children: '"Cancel Subscription"' }),
              " - End your subscription (remains active until period end)"
            ] }),
            /* @__PURE__ */ jsx("li", { children: "• Contact support if you need assistance with your subscription" })
          ] })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(
      ConfirmDialog,
      {
        isOpen: showCancelDialog,
        onClose: () => setShowCancelDialog(false),
        onConfirm: confirmCancelSubscription,
        title: "Cancel Subscription",
        message: "Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.",
        confirmText: "Yes, Cancel Subscription",
        cancelText: "Keep Subscription",
        type: "danger",
        loading: actionLoading === "cancel"
      }
    )
  ] });
}

function PricingSection() {
  const { user } = useAuth();
  const { credits } = useCredit();
  const { isActive: hasActiveSubscription, isLoading: subscriptionLoading } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const handleFreePlanSelect = () => {
    if (!user) {
      setError("Please log in first to use the free trial");
      return;
    }
    window.location.href = "/analyze?plan=free";
  };
  const handlePlanSelect = async (planId) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedPlan(planId);
      setPaymentStatus("processing");
      /* @__PURE__ */ console.log("💳 Starting subscription process for plan:", planId);
      if (!isLemonsqueezyConfigured()) {
        throw new Error("Payment service is temporarily unavailable, please try again later");
      }
      const currentService = LemonsqueezyService.getInstance();
      if (!user) {
        throw new Error("Please log in first before subscribing to a plan");
      }
      const userInfo = {
        userId: user.id,
        userEmail: user.email || "",
        userName: user.user_metadata?.full_name || user.email?.split("@")[0] || ""
      };
      /* @__PURE__ */ console.log("💳 Creating subscription checkout with user info:", userInfo);
      const checkout = await currentService.createCheckout(planId, userInfo);
      /* @__PURE__ */ console.log("💳 Checkout created successfully:", checkout);
      if (!checkout?.data?.attributes?.url) {
        throw new Error("Checkout session creation failed: missing payment link");
      }
      setPaymentStatus("redirecting");
      const plan = SUBSCRIPTION_PLANS[planId];
      sessionStorage.setItem("pendingPayment", JSON.stringify({
        planId,
        checkoutId: checkout.data.id,
        timestamp: Date.now(),
        credits: plan.credits,
        type: "subscription"
      }));
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      window.location.href = checkout.data.attributes.url;
    } catch (error2) {
      console.error("💳 Subscription initiation failed:", error2);
      setPaymentStatus("failed");
      let errorMessage = "Subscription initialization failed, please try again later";
      if (error2 instanceof LemonsqueezyError) {
        switch (error2.code) {
          case "MISSING_API_KEY":
          case "MISSING_VARIANT_ID":
          case "SERVICE_NOT_CONFIGURED":
            errorMessage = "Payment service configuration error, please contact customer service";
            break;
          case "INVALID_PLAN_ID":
            errorMessage = "Selected plan is invalid, please choose again";
            break;
          case "CHECKOUT_CREATION_FAILED":
            errorMessage = "Failed to create payment session, please try again later";
            break;
          default:
            errorMessage = error2.message || "Payment service is temporarily unavailable";
        }
      } else if (error2 instanceof Error) {
        errorMessage = error2.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  };
  const plansArray = Object.values(SUBSCRIPTION_PLANS);
  const getValueMetrics = (plan) => {
    const pricePerCredit = plan.price / plan.credits;
    const minutesOfAnalysis = Math.floor(plan.credits / 60);
    const pricePerMinute = plan.price / minutesOfAnalysis;
    return {
      pricePerCredit: pricePerCredit.toFixed(4),
      minutesOfAnalysis,
      pricePerMinute: pricePerMinute.toFixed(2)
    };
  };
  if (subscriptionLoading) {
    return /* @__PURE__ */ jsx("div", { className: "relative bg-gradient-to-b py-20", children: /* @__PURE__ */ jsx("div", { className: "relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center py-20", children: [
      /* @__PURE__ */ jsx("div", { className: "w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" }),
      /* @__PURE__ */ jsx("span", { className: "ml-3 text-slate-300", children: "Loading subscription information..." })
    ] }) }) });
  }
  if (user && hasActiveSubscription) {
    return /* @__PURE__ */ jsxs("div", { className: "relative bg-gradient-to-b py-20", children: [
      /* @__PURE__ */ jsxs("div", { className: "absolute inset-0 overflow-hidden", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute top-1/4 left-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" }),
        /* @__PURE__ */ jsx("div", { className: "absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "text-center mb-16", children: [
          /* @__PURE__ */ jsx("h1", { className: "text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight", children: "Subscription Management" }),
          /* @__PURE__ */ jsx("p", { className: "text-xl text-slate-300 leading-relaxed mb-8 max-w-3xl mx-auto", children: "Manage your active subscription, view billing information, and update your plan settings." }),
          /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700 mb-8", children: [
            /* @__PURE__ */ jsx("svg", { className: "w-5 h-5 text-green-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" }) }),
            /* @__PURE__ */ jsx("span", { className: "text-slate-300", children: "Current Credits:" }),
            /* @__PURE__ */ jsx("span", { className: "text-green-400 font-semibold", children: credits.toLocaleString() })
          ] })
        ] }),
        /* @__PURE__ */ jsx(SubscriptionManagement, {})
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "relative bg-gradient-to-b py-20", children: [
    /* @__PURE__ */ jsxs("div", { className: "absolute inset-0 overflow-hidden", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute top-1/4 left-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl" }),
      /* @__PURE__ */ jsx("div", { className: "absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-center mb-16", children: [
        /* @__PURE__ */ jsx("h1", { className: "text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight", children: "Choose Your Subscription Plan" }),
        /* @__PURE__ */ jsx("p", { className: "text-xl text-slate-300 leading-relaxed mb-8 max-w-3xl mx-auto", children: "Start with a free trial or choose a monthly subscription plan that fits your needs. Professional AI audio analysis service, pay monthly, cancel anytime." }),
        user && /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700 mb-8", children: [
          /* @__PURE__ */ jsx("svg", { className: "w-5 h-5 text-green-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" }) }),
          /* @__PURE__ */ jsx("span", { className: "text-slate-300", children: "Current Credits:" }),
          /* @__PURE__ */ jsx("span", { className: "text-green-400 font-semibold", children: credits.toLocaleString() })
        ] })
      ] }),
      (paymentStatus === "processing" || paymentStatus === "redirecting") && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm", children: /* @__PURE__ */ jsx("div", { className: "bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700 max-w-md mx-4", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsx("div", { className: "w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin flex-shrink-0" }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { className: "text-white font-semibold mb-1", children: paymentStatus === "processing" ? "Processing Subscription" : "Redirecting to Payment" }),
          /* @__PURE__ */ jsx("p", { className: "text-slate-300 text-sm", children: paymentStatus === "processing" ? "Creating your subscription session..." : "Redirecting to secure payment page..." })
        ] })
      ] }) }) }),
      error && /* @__PURE__ */ jsx("div", { className: "fixed top-4 right-4 z-50 max-w-md", children: /* @__PURE__ */ jsx("div", { className: "bg-red-500/90 backdrop-blur-sm text-white p-4 rounded-xl shadow-2xl border border-red-400/30", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
        /* @__PURE__ */ jsx("svg", { className: "w-5 h-5 text-red-200 mt-0.5 flex-shrink-0", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1", children: [
          /* @__PURE__ */ jsx("p", { className: "font-medium mb-1", children: "Subscription Error" }),
          /* @__PURE__ */ jsx("p", { className: "text-red-100 text-sm", children: error })
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => {
              setError(null);
              setPaymentStatus("idle");
            },
            className: "text-red-200 hover:text-white transition-colors",
            children: /* @__PURE__ */ jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) })
          }
        )
      ] }) }) }),
      user && hasActiveSubscription && /* @__PURE__ */ jsx("div", { className: "max-w-4xl mx-auto mb-12 p-6 bg-green-500/10 border border-green-500/30 rounded-xl", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4", children: [
        /* @__PURE__ */ jsx("svg", { className: "w-6 h-6 text-green-400 mt-1 flex-shrink-0", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { className: "text-green-300 font-medium mb-2", children: "You Have an Active Subscription" }),
          /* @__PURE__ */ jsx("p", { className: "text-green-200 text-sm mb-4", children: "You currently have an active subscription. You cannot subscribe to additional plans while your current subscription is active." }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-3", children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => window.scrollTo({ top: 0, behavior: "smooth" }),
                className: "px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-colors duration-200 text-sm",
                children: "Manage Current Subscription"
              }
            ),
            /* @__PURE__ */ jsx(
              "a",
              {
                href: "/analyze",
                className: "px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-colors duration-200 text-sm",
                children: "Start Analyzing"
              }
            )
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "grid lg:grid-cols-4 md:grid-cols-2 gap-8 max-w-7xl mx-auto", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative p-8 rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/5 to-emerald-500/5 hover:scale-105 transition-all duration-300 cursor-pointer flex flex-col h-full", children: [
          /* @__PURE__ */ jsx("div", { className: "absolute -top-4 left-1/2 transform -translate-x-1/2", children: /* @__PURE__ */ jsx("span", { className: "bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-full", children: "Free Trial" }) }),
          /* @__PURE__ */ jsxs("div", { className: "text-center flex-grow flex flex-col", children: [
            /* @__PURE__ */ jsx("h3", { className: "text-2xl font-bold text-white mb-2", children: FREE_PLAN.name }),
            /* @__PURE__ */ jsx("p", { className: "text-slate-400 text-sm mb-6", children: FREE_PLAN.description }),
            /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
              /* @__PURE__ */ jsx("span", { className: "text-4xl font-bold text-white", children: "Free" }),
              /* @__PURE__ */ jsx("div", { className: "text-slate-400 text-sm mt-1", children: "Forever Free" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
              /* @__PURE__ */ jsxs("div", { className: "text-2xl font-bold text-green-400 mb-2", children: [
                "Not logged in: ",
                FREE_PLAN.credits,
                " credits"
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "text-2xl font-bold text-green-400 mb-2", children: [
                "Logged in: ",
                FREE_PLAN.creditsLoggedIn,
                " credits/month"
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "text-slate-400 text-sm", children: [
                "Logged in users get about ",
                Math.floor(FREE_PLAN.creditsLoggedIn / 60),
                " minutes of audio analysis"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "mb-8 space-y-3 text-left flex-grow", children: [
              FREE_PLAN.features.map((feature, index) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-sm text-slate-300", children: [
                /* @__PURE__ */ jsx("svg", { className: "w-4 h-4 text-green-400 flex-shrink-0", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }),
                feature
              ] }, index)),
              FREE_PLAN.limitations.map((limitation, index) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-sm text-slate-400", children: [
                /* @__PURE__ */ jsx("svg", { className: "w-4 h-4 text-slate-500 flex-shrink-0", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }),
                limitation
              ] }, `limit-${index}`))
            ] }),
            /* @__PURE__ */ jsx("div", { className: "mt-auto", children: /* @__PURE__ */ jsx(
              "button",
              {
                onClick: handleFreePlanSelect,
                className: "w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl hover:shadow-green-500/25",
                children: "Start Free"
              }
            ) })
          ] })
        ] }),
        plansArray.map((plan) => {
          const valueMetrics = getValueMetrics(plan);
          const isLoading = loading && selectedPlan === plan.id;
          const isDisabled = loading && selectedPlan !== plan.id;
          const isPopular = plan.popular;
          return /* @__PURE__ */ jsxs(
            "div",
            {
              className: `relative p-8 rounded-2xl border transition-all duration-300 flex flex-col h-full ${isDisabled ? "opacity-50 cursor-not-allowed" : "hover:scale-105 cursor-pointer"} ${isPopular ? "border-violet-500/50 bg-gradient-to-br from-violet-500/10 to-blue-500/10 shadow-xl shadow-violet-500/20" : "border-slate-700 bg-slate-800/30 hover:border-slate-600"}`,
              children: [
                isPopular && /* @__PURE__ */ jsx("div", { className: "absolute -top-4 left-1/2 transform -translate-x-1/2", children: /* @__PURE__ */ jsx("span", { className: "bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-medium px-4 py-2 rounded-full", children: "Most Popular" }) }),
                /* @__PURE__ */ jsxs("div", { className: "text-center flex-grow flex flex-col", children: [
                  /* @__PURE__ */ jsx("h3", { className: "text-2xl font-bold text-white mb-2", children: plan.name }),
                  /* @__PURE__ */ jsx("p", { className: "text-slate-400 text-sm mb-6", children: plan.description }),
                  /* @__PURE__ */ jsxs("div", { className: "mb-6", children: [
                    /* @__PURE__ */ jsxs("span", { className: "text-4xl font-bold text-white", children: [
                      "$",
                      plan.price
                    ] }),
                    /* @__PURE__ */ jsx("span", { className: "text-slate-400 text-sm ml-2", children: "/month" }),
                    /* @__PURE__ */ jsx("div", { className: "text-slate-500 text-xs mt-1", children: "Auto-renews monthly, cancel anytime" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "mb-8", children: [
                    /* @__PURE__ */ jsxs("div", { className: "text-3xl font-bold text-violet-400 mb-2", children: [
                      plan.credits.toLocaleString(),
                      " credits/month"
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "text-slate-400 text-sm", children: [
                      "About ",
                      valueMetrics.minutesOfAnalysis,
                      " minutes of audio analysis"
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "text-slate-500 text-xs mt-1", children: [
                      "$",
                      valueMetrics.pricePerMinute,
                      "/minute"
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { className: "mb-8 space-y-3 text-left flex-grow", children: [
                    plan.features.map((feature, index) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 text-sm text-slate-300", children: [
                      /* @__PURE__ */ jsx("svg", { className: "w-4 h-4 text-green-400 flex-shrink-0", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }),
                      feature
                    ] }, index)),
                    plan.audioFormats && /* @__PURE__ */ jsxs("div", { className: "mt-4 pt-4 border-t border-slate-700", children: [
                      /* @__PURE__ */ jsx("div", { className: "text-xs text-slate-400 mb-2", children: "Supported formats:" }),
                      /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1", children: plan.audioFormats.map((format, index) => /* @__PURE__ */ jsx("span", { className: "px-2 py-1 bg-slate-700/50 text-xs text-slate-300 rounded", children: format }, index)) })
                    ] }),
                    plan.exportFormats && /* @__PURE__ */ jsxs("div", { className: "mt-3", children: [
                      /* @__PURE__ */ jsx("div", { className: "text-xs text-slate-400 mb-2", children: "Export formats:" }),
                      /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1", children: plan.exportFormats.map((format, index) => /* @__PURE__ */ jsx("span", { className: "px-2 py-1 bg-violet-500/20 text-xs text-violet-300 rounded", children: format }, index)) })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsx("div", { className: "mt-auto", children: user && hasActiveSubscription ? /* @__PURE__ */ jsxs(
                    "button",
                    {
                      disabled: true,
                      className: "w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 bg-slate-600/50 text-slate-400 cursor-not-allowed",
                      children: [
                        /* @__PURE__ */ jsx("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }),
                        "Already Subscribed"
                      ]
                    }
                  ) : /* @__PURE__ */ jsxs(
                    "button",
                    {
                      onClick: () => !isDisabled && handlePlanSelect(plan.id),
                      disabled: isDisabled,
                      className: `w-full py-4 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${isPopular ? "bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:from-violet-600 hover:to-blue-600 disabled:from-violet-500/50 disabled:to-blue-500/50 shadow-lg hover:shadow-xl hover:shadow-violet-500/25" : "bg-slate-700 text-white hover:bg-slate-600 disabled:bg-slate-700/50"} disabled:cursor-not-allowed`,
                      children: [
                        isLoading && /* @__PURE__ */ jsx("div", { className: "w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" }),
                        isLoading ? paymentStatus === "redirecting" ? "Redirecting..." : "Processing..." : "Start Subscription"
                      ]
                    }
                  ) })
                ] })
              ]
            },
            plan.id
          );
        })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-16 max-w-4xl mx-auto grid md:grid-cols-2 gap-6", children: [
        /* @__PURE__ */ jsx("div", { className: "p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4", children: [
          /* @__PURE__ */ jsx("svg", { className: "w-6 h-6 text-blue-400 mt-1 flex-shrink-0", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-blue-400 font-medium mb-2", children: "Subscription Details" }),
            /* @__PURE__ */ jsxs("ul", { className: "text-blue-300 space-y-1 text-sm", children: [
              /* @__PURE__ */ jsx("li", { children: "• Payment securely processed by Lemonsqueezy, supports credit cards, PayPal, etc." }),
              /* @__PURE__ */ jsx("li", { children: "• Auto-renews monthly, credits allocated to account monthly" }),
              /* @__PURE__ */ jsx("li", { children: "• 1 credit = 1 second of audio analysis, deducted based on actual usage" }),
              /* @__PURE__ */ jsx("li", { children: "• Cancel subscription anytime in customer portal, no penalty fees" })
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ jsx("div", { className: "p-6 bg-violet-500/10 border border-violet-500/20 rounded-xl", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-4", children: [
          /* @__PURE__ */ jsx("svg", { className: "w-6 h-6 text-violet-400 mt-1 flex-shrink-0", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" }) }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-violet-400 font-medium mb-2", children: "Monthly Subscription Benefits" }),
            /* @__PURE__ */ jsxs("ul", { className: "text-violet-300 space-y-1 text-sm", children: [
              /* @__PURE__ */ jsx("li", { children: "• Fixed monthly credit allowance for more regular usage" }),
              /* @__PURE__ */ jsx("li", { children: "• Lower monthly cost, more cash flow friendly" }),
              /* @__PURE__ */ jsx("li", { children: "• Auto-renewal, no manual top-ups needed" }),
              /* @__PURE__ */ jsx("li", { children: "• Flexible cancellation, no long-term contract commitment" })
            ] })
          ] })
        ] }) })
      ] }),
      !LemonsqueezyService.getInstance().isConfigured() && /* @__PURE__ */ jsx("div", { className: "mt-8 max-w-2xl mx-auto p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl", children: /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
        /* @__PURE__ */ jsx("div", { className: "w-16 h-16 mx-auto mb-4 bg-blue-500/20 rounded-full flex items-center justify-center", children: /* @__PURE__ */ jsx("svg", { className: "w-8 h-8 text-blue-400", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }) }),
        /* @__PURE__ */ jsx("h3", { className: "text-xl font-semibold text-blue-400 mb-2", children: "Subscription System Configuration" }),
        /* @__PURE__ */ jsx("p", { className: "text-blue-300 mb-4", children: "We are configuring a secure subscription system and will soon provide monthly subscription services." }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2 text-sm text-blue-200", children: [
          /* @__PURE__ */ jsx("p", { children: "• Support for multiple secure payment methods" }),
          /* @__PURE__ */ jsx("p", { children: "• Automatic monthly credit allocation" }),
          /* @__PURE__ */ jsx("p", { children: "• Cancel subscription anytime" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-6 pt-4 border-t border-blue-500/20", children: [
          /* @__PURE__ */ jsx("p", { className: "text-blue-300 text-sm", children: "For immediate subscription, please contact customer service:" }),
          /* @__PURE__ */ jsxs(
            "a",
            {
              href: "/contact",
              className: "inline-flex items-center gap-2 mt-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors duration-200",
              children: [
                /* @__PURE__ */ jsx("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" }) }),
                "Contact Support"
              ]
            }
          )
        ] })
      ] }) })
    ] })
  ] });
}

function PricingPage() {
  return /* @__PURE__ */ jsx(AuthProvider, { children: /* @__PURE__ */ jsx(CreditProvider, { children: /* @__PURE__ */ jsx(PricingSection, {}) }) });
}

const $$Pricing = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Subscription Plans - Describe Music", "description": "Start with a free trial and choose the monthly subscription plan that suits you. Professional AI audio analysis service with flexible subscriptions that can be canceled anytime." }, { "default": ($$result2) => renderTemplate`  ${maybeRenderHead()}<div> ${renderComponent($$result2, "PricingPage", PricingPage, { "client:load": true, "client:component-hydration": "load", "client:component-path": "@/components/pricing/PricingPage.tsx", "client:component-export": "default" })} </div> ${renderComponent($$result2, "Container", $$Container, {}, { "default": ($$result3) => renderTemplate`  <div class="py-20"> <div class="text-center mb-16"> <h2 class="text-4xl font-bold text-white mb-4">
Why Choose Our Subscription Service?
</h2> <p class="text-xl text-slate-300 max-w-3xl mx-auto">
Start with a free trial and use our professional AI audio analysis
          service on-demand with flexible monthly subscriptions.
</p> </div> <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"> <div class="text-center p-8 bg-slate-800/30 rounded-xl border border-slate-700"> <div class="w-16 h-16 mx-auto mb-6 bg-green-500/20 rounded-xl flex items-center justify-center"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:gift-20-solid", "class": "w-8 h-8 text-green-400" })} </div> <h3 class="text-xl font-semibold text-white mb-4">Start Free</h3> <p class="text-slate-300">
Get 180 free credits monthly (3 minutes) to experience our AI audio
            analysis service without payment.
</p> </div> <div class="text-center p-8 bg-slate-800/30 rounded-xl border border-slate-700"> <div class="w-16 h-16 mx-auto mb-6 bg-blue-500/20 rounded-xl flex items-center justify-center"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:arrow-path-20-solid", "class": "w-8 h-8 text-blue-400" })} </div> <h3 class="text-xl font-semibold text-white mb-4">
Flexible Subscription
</h3> <p class="text-slate-300">
Monthly subscription model with automatic credit allocation each
            month. Cancel anytime with no long-term contract commitment.
</p> </div> <div class="text-center p-8 bg-slate-800/30 rounded-xl border border-slate-700"> <div class="w-16 h-16 mx-auto mb-6 bg-violet-500/20 rounded-xl flex items-center justify-center"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:shield-check-20-solid", "class": "w-8 h-8 text-violet-400" })} </div> <h3 class="text-xl font-semibold text-white mb-4">
Secure & Reliable
</h3> <p class="text-slate-300">
Processed through Lemonsqueezy secure payment platform, supporting
            multiple payment methods to ensure your financial security.
</p> </div> </div> </div>  <div class="py-20"> <div class="text-center mb-16"> <h2 class="text-4xl font-bold text-white mb-4">Feature Comparison</h2> <p class="text-xl text-slate-300">
Detailed overview of feature differences across plans
</p> </div> <div class="max-w-6xl mx-auto overflow-x-auto"> <table class="w-full bg-slate-800/30 rounded-xl border border-slate-700"> <thead> <tr class="border-b border-slate-700"> <th class="text-left p-6 text-white font-semibold">Features</th> <th class="text-center p-6 text-green-400 font-semibold">Free Trial</th> <th class="text-center p-6 text-blue-400 font-semibold">Basic Plan</th> <th class="text-center p-6 text-violet-400 font-semibold">Professional Plan</th> <th class="text-center p-6 text-orange-400 font-semibold">Enterprise Plan</th> </tr> </thead> <tbody class="text-sm"> <tr class="border-b border-slate-700/50"> <td class="p-4 text-slate-300 font-medium">Monthly Credits</td> <td class="p-4 text-center text-slate-300"> <div>Not logged in: 100</div> <div>Logged in: 200</div> </td> <td class="p-4 text-center text-slate-300">1200 (20 minutes)</td> <td class="p-4 text-center text-slate-300">3000 (50 minutes)</td> <td class="p-4 text-center text-slate-300">7200 (120 minutes)</td> </tr> <tr class="border-b border-slate-700/50"> <td class="p-4 text-slate-300 font-medium">Analysis Features</td> <td class="p-4 text-center text-slate-300">Basic</td> <td class="p-4 text-center text-slate-300">Advanced</td> <td class="p-4 text-center text-slate-300">Advanced</td> <td class="p-4 text-center text-slate-300">Advanced</td> </tr> <tr class="border-b border-slate-700/50"> <td class="p-4 text-slate-300 font-medium">Export Features</td> <td class="p-4 text-center"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:x-mark-20-solid", "class": "w-5 h-5 text-red-400 mx-auto" })} </td> <td class="p-4 text-center"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:check-20-solid", "class": "w-5 h-5 text-green-400 mx-auto" })} </td> <td class="p-4 text-center"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:check-20-solid", "class": "w-5 h-5 text-green-400 mx-auto" })} </td> <td class="p-4 text-center"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:check-20-solid", "class": "w-5 h-5 text-green-400 mx-auto" })} </td> </tr> <tr class="border-b border-slate-700/50"> <td class="p-4 text-slate-300 font-medium">Supported Audio Formats</td> <td class="p-4 text-center text-slate-300">MP3</td> <td class="p-4 text-center text-slate-300">MP3, WAV</td> <td class="p-4 text-center text-slate-300">All Formats</td> <td class="p-4 text-center text-slate-300">All Formats</td> </tr> <tr class="border-b border-slate-700/50"> <td class="p-4 text-slate-300 font-medium">Max File Size</td> <td class="p-4 text-center text-slate-300">10MB</td> <td class="p-4 text-center text-slate-300">50MB</td> <td class="p-4 text-center text-slate-300">200MB</td> <td class="p-4 text-center text-slate-300">200MB</td> </tr> <tr class="border-b border-slate-700/50"> <td class="p-4 text-slate-300 font-medium">Export Formats</td> <td class="p-4 text-center text-slate-400">-</td> <td class="p-4 text-center text-slate-300">PDF, TXT</td> <td class="p-4 text-center text-slate-300">PDF, TXT, CSV, JSON</td> <td class="p-4 text-center text-slate-300">PDF, TXT, CSV, JSON</td> </tr> <tr class="border-b border-slate-700/50"> <td class="p-4 text-slate-300 font-medium">Batch Processing</td> <td class="p-4 text-center"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:x-mark-20-solid", "class": "w-5 h-5 text-red-400 mx-auto" })} </td> <td class="p-4 text-center"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:x-mark-20-solid", "class": "w-5 h-5 text-red-400 mx-auto" })} </td> <td class="p-4 text-center text-slate-300"> <div class="flex items-center justify-center gap-1"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:wrench-screwdriver-20-solid", "class": "w-4 h-4 text-yellow-400" })} <span class="text-xs">In Development</span> </div> </td> <td class="p-4 text-center text-slate-300"> <div class="flex items-center justify-center gap-1"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:wrench-screwdriver-20-solid", "class": "w-4 h-4 text-yellow-400" })} <span class="text-xs">In Development</span> </div> </td> </tr> <tr class="border-b border-slate-700/50"> <td class="p-4 text-slate-300 font-medium">API Access</td> <td class="p-4 text-center"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:x-mark-20-solid", "class": "w-5 h-5 text-red-400 mx-auto" })} </td> <td class="p-4 text-center"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:x-mark-20-solid", "class": "w-5 h-5 text-red-400 mx-auto" })} </td> <td class="p-4 text-center text-slate-300"> <div class="flex items-center justify-center gap-1"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:wrench-screwdriver-20-solid", "class": "w-4 h-4 text-yellow-400" })} <span class="text-xs">In Development</span> </div> </td> <td class="p-4 text-center text-slate-300"> <div class="flex items-center justify-center gap-1"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:wrench-screwdriver-20-solid", "class": "w-4 h-4 text-yellow-400" })} <span class="text-xs">In Development</span> </div> </td> </tr> <tr> <td class="p-4 text-slate-300 font-medium">Customer Support</td> <td class="p-4 text-center text-slate-300">Community</td> <td class="p-4 text-center text-slate-300">Email</td> <td class="p-4 text-center text-slate-300">Email</td> <td class="p-4 text-center text-slate-300">Email</td> </tr> </tbody> </table> </div> </div>  <div class="py-20"> <div class="text-center mb-16"> <h2 class="text-4xl font-bold text-white mb-4">
Frequently Asked Questions
</h2> <p class="text-xl text-slate-300">
Common questions and answers about subscription plans and credit
          system
</p> </div> <div class="max-w-3xl mx-auto space-y-6"> <div class="bg-slate-800/30 rounded-xl border border-slate-700 p-6"> <h4 class="text-lg font-semibold text-white mb-3 flex items-center gap-2"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:question-mark-circle-20-solid", "class": "w-5 h-5 text-violet-400" })}
How are credits calculated?
</h4> <p class="text-slate-300 pl-7">
Our credit system charges per second, 1 credit = 1 second of audio
            analysis. For example, analyzing a 3-minute song requires 180
            credits.
</p> </div> <div class="bg-slate-800/30 rounded-xl border border-slate-700 p-6"> <h4 class="text-lg font-semibold text-white mb-3 flex items-center gap-2"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:question-mark-circle-20-solid", "class": "w-5 h-5 text-violet-400" })}
What are the limitations of the free plan?
</h4> <p class="text-slate-300 pl-7">
Free users get 100 credits when not logged in, and 200 credits
            monthly (about 3.3 minutes) when logged in. Only supports MP3 format
            (max 10MB), basic analysis features, no export functionality, and
            can only view analysis results online. Upgrade to paid plans for
            advanced analysis, export features, and support for more audio
            formats.
</p> </div> <div class="bg-slate-800/30 rounded-xl border border-slate-700 p-6"> <h4 class="text-lg font-semibold text-white mb-3 flex items-center gap-2"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:question-mark-circle-20-solid", "class": "w-5 h-5 text-violet-400" })}
What additional features do paid plans include?
</h4> <p class="text-slate-300 pl-7">
Paid plans include advanced audio analysis, report export
            functionality (PDF, TXT, CSV, JSON formats), support for more audio
            formats, larger file upload limits (50MB-200MB), and email customer
            support. Professional and Enterprise plans will also provide batch
            processing and API access features (In Development).
</p> </div> <div class="bg-slate-800/30 rounded-xl border border-slate-700 p-6"> <h4 class="text-lg font-semibold text-white mb-3 flex items-center gap-2"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:question-mark-circle-20-solid", "class": "w-5 h-5 text-violet-400" })}
How to cancel subscription?
</h4> <p class="text-slate-300 pl-7">
You can cancel your subscription anytime in the customer portal
            without penalty fees. After cancellation, you can still use
            remaining credits until the current billing cycle ends.
</p> </div> <div class="bg-slate-800/30 rounded-xl border border-slate-700 p-6"> <h4 class="text-lg font-semibold text-white mb-3 flex items-center gap-2"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:question-mark-circle-20-solid", "class": "w-5 h-5 text-violet-400" })}
Do credits expire?
</h4> <p class="text-slate-300 pl-7">
Monthly subscription users' credits are valid for the current month,
            unused credits do not carry over to the next month. Free users'
            credits reset monthly.
</p> </div> <div class="bg-slate-800/30 rounded-xl border border-slate-700 p-6"> <h4 class="text-lg font-semibold text-white mb-3 flex items-center gap-2"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:question-mark-circle-20-solid", "class": "w-5 h-5 text-violet-400" })}
What audio formats are supported?
</h4> <p class="text-slate-300 pl-7">
Free plan only supports MP3 format. Basic plan supports MP3 and WAV
            formats. Professional and Enterprise plans support all mainstream
            audio formats, including MP3, WAV, FLAC, M4A, AAC, OGG, WMA, AIFF,
            etc.
</p> </div> <div class="bg-slate-800/30 rounded-xl border border-slate-700 p-6"> <h4 class="text-lg font-semibold text-white mb-3 flex items-center gap-2"> ${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:question-mark-circle-20-solid", "class": "w-5 h-5 text-violet-400" })}
What payment methods are supported?
</h4> <p class="text-slate-300 pl-7">
We support multiple secure payment methods through Lemonsqueezy,
            including credit cards, debit cards, PayPal, etc. All payments are
            encrypted and protected.
</p> </div> </div> </div>  <div class="py-20 text-center"> <div class="max-w-2xl mx-auto"> <h2 class="text-3xl font-bold text-white mb-6">
Ready to Start Analyzing Your Music?
</h2> <p class="text-xl text-slate-300 mb-8">
Start with a free trial or choose the monthly subscription plan that
          suits you, and use our powerful AI audio analysis service.
</p> <a href="/analyze" class="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-500 to-blue-500 text-white font-semibold rounded-xl hover:from-violet-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-violet-500/25">
Start Analyzing Music
${renderComponent($$result3, "Icon", $$Icon, { "name": "heroicons:arrow-right-20-solid", "class": "w-5 h-5" })} </a> </div> </div> ` })} ` })}`;
}, "/Users/andy/VSCodeProjects/DescribeMusic/src/pages/pricing.astro", void 0);

const $$file = "/Users/andy/VSCodeProjects/DescribeMusic/src/pages/pricing.astro";
const $$url = "/pricing";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    default: $$Pricing,
    file: $$file,
    url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
