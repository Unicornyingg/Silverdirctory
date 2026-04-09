type OnboardingStepperProps = {
  currentStep: 1 | 2 | 3 | 4;
  className?: string;
};

const ONBOARDING_STEPS = ["Account", "Verify", "Profile", "Live"] as const;

export default function OnboardingStepper({
  currentStep,
  className,
}: OnboardingStepperProps) {
  return (
    <div
      className={`rounded-xl border border-[#d8e3eb] bg-white/85 px-3 py-3 ${className ?? ""}`}
      aria-label="Caregiver onboarding progress"
    >
      <ol className="flex items-center gap-2 overflow-x-auto pb-1">
        {ONBOARDING_STEPS.map((label, index) => {
          const step = (index + 1) as 1 | 2 | 3 | 4;
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;

          return (
            <li key={label} className="flex min-w-max items-center gap-2">
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  isCompleted
                    ? "border border-[#4338ca] bg-[#4338ca] text-white"
                    : isCurrent
                      ? "border-2 border-[#4338ca] bg-white text-[#4338ca]"
                      : "border border-[#c5d4e2] bg-white text-[#70839c]"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isCompleted ? "OK" : step}
              </span>
              <span
                className={`text-xs font-semibold ${
                  isCurrent || isCompleted ? "text-[#1f3f5d]" : "text-[#6e8198]"
                }`}
              >
                {label}
              </span>
              {step < 4 && <span aria-hidden="true" className="h-px w-4 bg-[#d8e3eb]" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
