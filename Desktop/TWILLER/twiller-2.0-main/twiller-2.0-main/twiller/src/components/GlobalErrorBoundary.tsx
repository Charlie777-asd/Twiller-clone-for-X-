"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Unhandled runtime error captured by boundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public componentDidMount() {
    if (typeof window !== "undefined") {
      window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
    }
  }

  public componentWillUnmount() {
    if (typeof window !== "undefined") {
      window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
    }
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error("Unhandled promise rejection caught globally:", event.reason);
    
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : String(reason);
    
    // Ignore routine authentication popup cancellations
    if (
      msg &&
      !msg.includes("auth/popup-closed-by-user") &&
      !msg.includes("auth/cancelled-popup-request")
    ) {
      // Dynamically load axiosInstance to access the showGlobalNetworkToast helper
      import("../lib/axiosInstance").then(({ showGlobalNetworkToast }) => {
        showGlobalNetworkToast(`Promise rejection: ${msg}`, "error");
      }).catch((err) => {
        console.warn("Failed to display global promise rejection toast:", err);
      });
    }
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-[#16181c] border border-[#2f3336] rounded-2xl p-8 text-center shadow-xl">
            <div className="w-16 h-16 bg-[#ef4444]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-[#ef4444]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold mb-3 text-white">Something went wrong</h1>
            <p className="text-[#71767b] text-[15px] mb-6 font-medium">
              An unexpected client-side error occurred. The application has safely recovered.
            </p>

            {this.state.error && (
              <div className="text-left bg-black/50 border border-[#2f3336] rounded-xl p-4 mb-6 max-h-40 overflow-y-auto font-mono text-xs text-red-400 break-all">
                <p className="font-semibold text-red-300 mb-1">{this.state.error.toString()}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="whitespace-pre-wrap opacity-80">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white font-bold py-3 px-4 rounded-full transition-colors text-[15px] cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
