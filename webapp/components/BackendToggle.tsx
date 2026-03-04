import type { Backend } from "@/hooks/useChat";

interface BackendToggleProps {
  backend: Backend;
  onChange: (backend: Backend) => void;
  disabled: boolean;
}

export function BackendToggle({
  backend,
  onChange,
  disabled,
}: BackendToggleProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      <span className="text-sm font-medium text-gray-600">Backend:</span>
      <div className="inline-flex rounded-lg bg-bg-dark p-1">
        <button
          onClick={() => onChange("cloud-run")}
          disabled={disabled}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            backend === "cloud-run"
              ? "bg-primary text-white shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          } disabled:opacity-50`}
        >
          Cloud Run
        </button>
        <button
          onClick={() => onChange("agent-engine")}
          disabled={disabled}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            backend === "agent-engine"
              ? "bg-primary text-white shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          } disabled:opacity-50`}
        >
          Agent Engine
        </button>
      </div>
    </div>
  );
}
