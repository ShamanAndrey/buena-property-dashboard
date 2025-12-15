"use client";

import type {
	WizardState,
	WizardUnit,
} from "@/app/(dashboard)/properties/new/page";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ExcelTable } from "./excel-table";

interface StepUnitsProps {
	state: WizardState;
	updateState: (updates: Partial<WizardState>) => void;
}

export function StepUnits({ state, updateState }: StepUnitsProps) {
	const handleUnitsChange = (units: WizardUnit[]) => {
		updateState({ units });
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Units</CardTitle>
				<CardDescription>
					Add all units for this property. Click cells to select, double-click
					to edit. Use keyboard shortcuts for quick navigation.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ExcelTable
					buildings={state.buildings}
					onUnitsChange={handleUnitsChange}
					units={state.units}
				/>
			</CardContent>
		</Card>
	);
}
