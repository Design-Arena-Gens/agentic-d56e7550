"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Clock, PlayCircle } from "lucide-react";
import { workflows as seedWorkflows, Workflow, WorkflowStatus } from "@/data/workflows";
import { computeSummaryMetrics, formatDateLabel } from "@/lib/metrics";

const statusConfig: Record<
  WorkflowStatus,
  { label: string; badge: string; dot: string }
> = {
  healthy: {
    label: "Healthy",
    badge: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
  },
  warning: {
    label: "Warning",
    badge: "bg-amber-100 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
  },
  failed: {
    label: "Failed",
    badge: "bg-rose-100 text-rose-700 border border-rose-200",
    dot: "bg-rose-500",
  },
  paused: {
    label: "Paused",
    badge: "bg-slate-100 text-slate-600 border border-slate-200",
    dot: "bg-slate-400",
  },
};

const slaPalette = {
  low: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  medium: "bg-amber-100 text-amber-700 border border-amber-200",
  high: "bg-rose-100 text-rose-700 border border-rose-200",
};

const statusFilters: { value: WorkflowStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "healthy", label: "Healthy" },
  { value: "warning", label: "Warning" },
  { value: "failed", label: "Failed" },
  { value: "paused", label: "Paused" },
];

const getStatusBadge = (status: WorkflowStatus) => {
  const config = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.badge}`}
    >
      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

const formatRelative = (iso: string) => {
  const now = new Date();
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  if (diffMs < 0) {
    const futureMinutes = Math.abs(Math.round(diffMs / 60000));
    if (futureMinutes < 1) return "In moments";
    if (futureMinutes < 60) return `In ${futureMinutes} min`;
    const futureHours = Math.round(futureMinutes / 60);
    if (futureHours < 24) return `In ${futureHours} hr`;
    const futureDays = Math.round(futureHours / 24);
    return `In ${futureDays}d`;
  }
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return "Now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
};

export const WorkflowDashboard = ({
  initialWorkflows = seedWorkflows,
}: {
  initialWorkflows?: Workflow[];
}) => {
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(
    initialWorkflows[0]?.id ?? "",
  );

  const clients = useMemo(() => {
    const unique = new Set(initialWorkflows.map((wf) => wf.client));
    return ["all", ...Array.from(unique)];
  }, [initialWorkflows]);

  const filteredWorkflows = useMemo(() => {
    return initialWorkflows.filter((workflow) => {
      const matchesClient =
        clientFilter === "all" || workflow.client === clientFilter;
      const matchesStatus =
        statusFilter === "all" || workflow.status === statusFilter;
      const matchesSearch =
        searchTerm.length === 0 ||
        workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        workflow.client.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesClient && matchesStatus && matchesSearch;
    });
  }, [clientFilter, statusFilter, searchTerm, initialWorkflows]);

  const summary = useMemo(
    () => computeSummaryMetrics(filteredWorkflows),
    [filteredWorkflows],
  );

  const selectedWorkflow = useMemo(() => {
    const byId =
      filteredWorkflows.find((workflow) => workflow.id === selectedWorkflowId) ??
      filteredWorkflows[0];
    return byId ?? null;
  }, [filteredWorkflows, selectedWorkflowId]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-sky-300/70">
              n8n Operations Hub
            </p>
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">
              Client Workflow Control Center
            </h1>
            <p className="text-sm text-slate-300">
              Live observability across managed automation environments.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Clock className="h-4 w-4 text-slate-400" />
            <span>{new Date().toLocaleString()}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-8">
        <section className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Managed Workflows"
            value={summary.totalWorkflows}
            subtitle={`${summary.healthy} healthy • ${summary.warning} warning • ${summary.failed} failed`}
          />
          <MetricCard
            title="Runs Today"
            value={summary.totalRunsToday}
            subtitle="Activity across every tenant"
          />
          <MetricCard
            title="Success Rate"
            value={`${Math.round(summary.avgSuccessRate * 100)}%`}
            subtitle="Rolling 24h window"
          />
          <MetricCard
            title="Avg Duration"
            value={`${summary.averageDurationSeconds}s`}
            subtitle="Execution time per workflow"
          />
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl shadow-slate-950/30 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Workflows</h2>
              <p className="text-sm text-slate-300">
                Track status, run cadence, and SLA posture for each automation.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
                <select
                  className="bg-transparent text-sm focus:outline-none"
                  value={clientFilter}
                  onChange={(event) => setClientFilter(event.target.value)}
                >
                  {clients.map((client) => (
                    <option key={client} value={client}>
                      {client === "all" ? "All clients" : client}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 rounded-full border border-white/10 bg-white/5 p-1 text-xs text-slate-200">
                {statusFilters.map((filter) => (
                  <button
                    key={filter.value}
                    className={`rounded-full px-3 py-1.5 transition ${
                      statusFilter === filter.value
                        ? "bg-sky-500 text-white shadow shadow-sky-500/40"
                        : "hover:bg-white/10"
                    }`}
                    onClick={() => setStatusFilter(filter.value)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <input
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
                placeholder="Search workflow or client"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/40">
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 border-b border-white/5 bg-white/5 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <span>Workflow</span>
                <span>Client</span>
                <span className="text-center">Runs</span>
                <span className="text-center">Success</span>
                <span className="text-center">Owner</span>
                <span className="text-center">SLA</span>
              </div>
              <div className="divide-y divide-white/5">
                {filteredWorkflows.map((workflow) => (
                  <button
                    key={workflow.id}
                    onClick={() => setSelectedWorkflowId(workflow.id)}
                    className={`grid w-full grid-cols-[auto_1fr_auto_auto_auto_auto] gap-3 px-4 py-4 text-left transition ${
                      selectedWorkflow?.id === workflow.id
                        ? "bg-sky-500/10"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <div className="flex flex-col">
                      <p className="font-semibold text-white">{workflow.name}</p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {workflow.triggers.map((trigger) => (
                          <span
                            key={trigger}
                            className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300"
                          >
                            {trigger}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-200">
                      {getStatusBadge(workflow.status)}
                    </div>
                    <div className="text-center text-sm text-slate-100">
                      {workflow.runsToday}
                      <p className="text-[11px] text-slate-400">today</p>
                    </div>
                    <div className="text-center text-sm text-slate-100">
                      {Math.round(workflow.successRate * 100)}%
                    </div>
                    <div className="text-center text-xs text-slate-300">
                      {workflow.owner}
                    </div>
                    <div className="text-center text-xs">
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 font-medium ${slaPalette[workflow.slaBreachRisk]}`}
                      >
                        {workflow.slaBreachRisk.toUpperCase()}
                      </span>
                    </div>
                  </button>
                ))}
                {filteredWorkflows.length === 0 && (
                  <div className="px-6 py-12 text-center text-sm text-slate-300">
                    No workflows match the current filters.
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-950/40 p-5">
              {selectedWorkflow ? (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Selected workflow
                      </p>
                      <h3 className="text-lg font-semibold text-white">
                        {selectedWorkflow.name}
                      </h3>
                      <p className="text-sm text-slate-300">
                        {selectedWorkflow.client}
                      </p>
                    </div>
                    <div>{getStatusBadge(selectedWorkflow.status)}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm text-slate-200">
                    <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Last run
                      </p>
                      <p className="font-semibold text-white">
                        {formatRelative(selectedWorkflow.lastRunAt)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDateLabel(selectedWorkflow.lastRunAt)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Next run
                      </p>
                      <p className="font-semibold text-white">
                        {selectedWorkflow.nextRunAt
                          ? formatRelative(selectedWorkflow.nextRunAt)
                          : "On demand"}
                      </p>
                      {selectedWorkflow.nextRunAt && (
                        <p className="text-xs text-slate-400">
                          {formatDateLabel(selectedWorkflow.nextRunAt)}
                        </p>
                      )}
                    </div>
                    <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Run cadence
                      </p>
                      <p className="font-semibold text-white">
                        {selectedWorkflow.triggers.join(" • ")}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-400">
                        Success rate
                      </p>
                      <p className="font-semibold text-white">
                        {Math.round(selectedWorkflow.successRate * 100)}%
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Execution trend (last 3 runs)</span>
                      <span>Errors</span>
                    </div>
                    <div className="mt-4 flex items-end gap-3">
                      {selectedWorkflow.runHistory.map((run) => {
                        const height = Math.max(14, Math.min(run.durationSeconds * 2.5, 60));
                        const hasError = run.errors > 0;
                        return (
                          <div
                            key={run.id}
                            className="flex flex-col items-center gap-2 text-[11px] text-slate-400"
                          >
                            <div
                              className={`flex w-12 items-end justify-center rounded-md border border-white/10 bg-gradient-to-t from-white/10 p-1 ${
                                hasError ? "to-rose-500/60" : "to-sky-500/60"
                              }`}
                              style={{ height }}
                            >
                              <span className="text-[11px] font-semibold text-white">
                                {run.durationSeconds}s
                              </span>
                            </div>
                            <div className="text-center">
                              <p>{formatDateLabel(run.timestamp)}</p>
                              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                                {hasError ? `${run.errors} issue` : "Clean"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
                    <div className="flex items-start gap-2">
                      {selectedWorkflow.status === "failed" ? (
                        <AlertTriangle className="mt-1 h-4 w-4" />
                      ) : selectedWorkflow.status === "warning" ? (
                        <AlertTriangle className="mt-1 h-4 w-4 text-amber-300" />
                      ) : (
                        <PlayCircle className="mt-1 h-4 w-4 text-emerald-200" />
                      )}
                      <div className="flex flex-col gap-1">
                        <p className="font-semibold">
                          {selectedWorkflow.status === "failed"
                            ? "Immediate remediation recommended"
                            : selectedWorkflow.status === "warning"
                              ? "Monitor for possible SLA slippage"
                              : "Workflow operating within SLA"}
                        </p>
                        <p className="text-xs text-rose-100/80">
                          SLA risk: {selectedWorkflow.slaBreachRisk.toUpperCase()} • Owner:{" "}
                          {selectedWorkflow.owner}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-1 items-center justify-center text-sm text-slate-300">
                  Select a workflow to view deeper diagnostics.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

const MetricCard = ({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: number | string;
  subtitle: string;
}) => (
  <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-slate-200">
    <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
    <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    <p className="mt-2 text-xs text-slate-400">{subtitle}</p>
  </div>
);

export default WorkflowDashboard;
