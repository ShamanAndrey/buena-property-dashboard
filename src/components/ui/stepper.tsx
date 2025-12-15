"use client";

import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface StepperProps {
	steps: { id: string; title: string; description?: string }[];
	currentStep: number;
	onStepClick?: (step: number) => void;
	className?: string;
}

function Stepper({ steps, currentStep, onStepClick, className }: StepperProps) {
	return (
		<nav aria-label="Progress" className={cn("w-full", className)}>
			<ol className="flex items-center justify-between">
				{steps.map((step, index) => {
					const isCompleted = index < currentStep;
					const isCurrent = index === currentStep;
					const isClickable = onStepClick && index <= currentStep;

					return (
						<li className="relative flex flex-1 flex-col" key={step.id}>
							<div className="flex items-center">
								{/* Connector line (before) */}
								{index > 0 && (
									<div
										className={cn(
											"-translate-y-1/2 absolute top-4 right-1/2 left-0 h-0.5",
											isCompleted || isCurrent
												? "bg-primary"
												: "bg-muted-foreground/25",
										)}
									/>
								)}

								{/* Step circle */}
								<button
									className={cn(
										"relative z-10 mx-auto flex size-8 items-center justify-center rounded-full border-2 font-medium text-sm transition-colors",
										isCompleted &&
											"border-primary bg-primary text-primary-foreground",
										isCurrent && "border-primary bg-background text-primary",
										!isCompleted &&
											!isCurrent &&
											"border-muted-foreground/25 bg-background text-muted-foreground",
										isClickable && "cursor-pointer hover:border-primary/80",
										!isClickable && "cursor-default",
									)}
									disabled={!isClickable}
									onClick={() => isClickable && onStepClick?.(index)}
									type="button"
								>
									{isCompleted ? (
										<CheckIcon className="size-4" />
									) : (
										<span>{index + 1}</span>
									)}
								</button>

								{/* Connector line (after) */}
								{index < steps.length - 1 && (
									<div
										className={cn(
											"-translate-y-1/2 absolute top-4 right-0 left-1/2 h-0.5",
											isCompleted ? "bg-primary" : "bg-muted-foreground/25",
										)}
									/>
								)}
							</div>

							{/* Step label */}
							<div className="mt-3 text-center">
								<span
									className={cn(
										"font-medium text-sm",
										isCurrent && "text-primary",
										isCompleted && "text-foreground",
										!isCurrent && !isCompleted && "text-muted-foreground",
									)}
								>
									{step.title}
								</span>
								{step.description && (
									<p className="mt-0.5 text-muted-foreground text-xs">
										{step.description}
									</p>
								)}
							</div>
						</li>
					);
				})}
			</ol>
		</nav>
	);
}

export { Stepper };
