import type { DashboardData } from "@/lib/dashboard";
import { CampaignResults } from "./CampaignResults";
import { GoneQuiet } from "./GoneQuiet";
import { RegularsTable } from "./RegularsTable";
import { StatCards } from "./StatCards";
import { UtilizationHeatmap } from "./UtilizationHeatmap";

export function OwnerDashboard({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <StatCards stats={data.stats} />
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <RegularsTable regulars={data.regulars} />
        <GoneQuiet customers={data.goneQuiet} monthlyValue={data.goneQuietMonthlyValue} venueName={data.venueName} />
      </div>
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <UtilizationHeatmap
          grid={data.grid}
          emptiest={data.emptiest}
          emptyKeys={data.emptyKeys}
          recipientCount={data.optedInCustomers}
          venueName={data.venueName}
        />
        {data.lastCampaign && <CampaignResults campaign={data.lastCampaign} />}
      </div>
    </div>
  );
}
