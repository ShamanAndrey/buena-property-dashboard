import { sql } from "drizzle-orm";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { buildings, properties, units } from "@/server/db/schema";

export const dashboardRouter = createTRPCRouter({
  // Get comprehensive dashboard statistics
  getStats: publicProcedure.query(async ({ ctx }) => {
    // Get all properties with their related data
    const propertiesData = await ctx.db
      .select({
        id: properties.id,
        name: properties.name,
        type: properties.type,
        totalLandSize: properties.totalLandSize,
        energyStandard: properties.energyStandard,
        heatingType: properties.heatingType,
        managerName: properties.managerName,
        accountantName: properties.accountantName,
        declarationFileUrl: properties.declarationFileUrl,
        createdAt: properties.createdAt,
      })
      .from(properties);

    // Get all buildings
    const buildingsData = await ctx.db
      .select({
        id: buildings.id,
        propertyId: buildings.propertyId,
        name: buildings.name,
        city: buildings.city,
        yearBuilt: buildings.yearBuilt,
        floors: buildings.floors,
        hasElevator: buildings.hasElevator,
        buildingType: buildings.buildingType,
      })
      .from(buildings);

    // Get all units with size
    const unitsData = await ctx.db
      .select({
        id: units.id,
        buildingId: units.buildingId,
        type: units.type,
        size: units.size,
        rooms: units.rooms,
      })
      .from(units);

    // ===== Basic Counts =====
    const totalProperties = propertiesData.length;
    const totalBuildings = buildingsData.length;
    const totalUnits = unitsData.length;

    // ===== Property Type Breakdown =====
    const wegCount = propertiesData.filter((p) => p.type === "WEG").length;
    const mvCount = propertiesData.filter((p) => p.type === "MV").length;

    // ===== Unit Type Breakdown =====
    const unitTypeBreakdown = {
      apartment: unitsData.filter((u) => u.type === "apartment").length,
      office: unitsData.filter((u) => u.type === "office").length,
      parking: unitsData.filter((u) => u.type === "parking").length,
      garden: unitsData.filter((u) => u.type === "garden").length,
    };

    // ===== Total Area =====
    const totalUnitArea = unitsData.reduce((acc, u) => {
      const size = u.size ? parseFloat(u.size) : 0;
      return acc + (isNaN(size) ? 0 : size);
    }, 0);

    // Parse land sizes (e.g., "2,450 m²" -> 2450)
    const totalLandSize = propertiesData.reduce((acc, p) => {
      if (!p.totalLandSize) return acc;
      const match = p.totalLandSize.match(/([\d.,]+)/);
      if (!match?.[0]) return acc;
      const size = parseFloat(match[0].replace(/[.,]/g, ""));
      return acc + (isNaN(size) ? 0 : size);
    }, 0);

    // ===== Building Age Distribution =====
    const currentYear = new Date().getFullYear();
    const buildingAgeDistribution = {
      new: 0, // 0-5 years
      recent: 0, // 6-15 years
      established: 0, // 16-30 years
      historic: 0, // 30+ years
      unknown: 0,
    };

    for (const b of buildingsData) {
      if (!b.yearBuilt) {
        buildingAgeDistribution.unknown++;
      } else {
        const age = currentYear - b.yearBuilt;
        if (age <= 5) buildingAgeDistribution.new++;
        else if (age <= 15) buildingAgeDistribution.recent++;
        else if (age <= 30) buildingAgeDistribution.established++;
        else buildingAgeDistribution.historic++;
      }
    }

    // ===== Energy Standards =====
    const energyStandards: Record<string, number> = {};
    for (const p of propertiesData) {
      const standard = p.energyStandard || "Not specified";
      energyStandards[standard] = (energyStandards[standard] || 0) + 1;
    }

    // ===== Properties Missing Data =====
    const propertiesMissingData = {
      noManager: propertiesData.filter((p) => !p.managerName).length,
      noAccountant: propertiesData.filter((p) => !p.accountantName).length,
      noDocument: propertiesData.filter((p) => !p.declarationFileUrl).length,
      total: propertiesData.filter(
        (p) => !p.managerName || !p.accountantName || !p.declarationFileUrl
      ).length,
    };

    // ===== Manager/Accountant Load =====
    const managerLoad: Record<string, number> = {};
    const accountantLoad: Record<string, number> = {};

    for (const p of propertiesData) {
      if (p.managerName) {
        managerLoad[p.managerName] = (managerLoad[p.managerName] || 0) + 1;
      }
      if (p.accountantName) {
        accountantLoad[p.accountantName] =
          (accountantLoad[p.accountantName] || 0) + 1;
      }
    }

    // Sort and get top managers/accountants
    const topManagers = Object.entries(managerLoad)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const topAccountants = Object.entries(accountantLoad)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // ===== Geographic Distribution =====
    const cityDistribution: Record<string, number> = {};
    for (const b of buildingsData) {
      const city = b.city || "Unknown";
      cityDistribution[city] = (cityDistribution[city] || 0) + 1;
    }

    const topCities = Object.entries(cityDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([city, count]) => ({ city, count }));

    // ===== Elevator Availability =====
    const elevatorStats = {
      withElevator: buildingsData.filter((b) => b.hasElevator === true).length,
      withoutElevator: buildingsData.filter((b) => b.hasElevator === false)
        .length,
      unknown: buildingsData.filter(
        (b) => b.hasElevator === null || b.hasElevator === undefined
      ).length,
    };

    // ===== Building Types =====
    const buildingTypes = {
      residential: buildingsData.filter((b) => b.buildingType === "residential")
        .length,
      commercial: buildingsData.filter((b) => b.buildingType === "commercial")
        .length,
      mixed: buildingsData.filter((b) => b.buildingType === "mixed").length,
      unspecified: buildingsData.filter(
        (b) =>
          !b.buildingType ||
          !["residential", "commercial", "mixed"].includes(b.buildingType)
      ).length,
    };

    // ===== Recent Activity =====
    const recentProperties = propertiesData
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        createdAt: p.createdAt,
      }));

    return {
      // Basic counts
      totalProperties,
      totalBuildings,
      totalUnits,
      wegCount,
      mvCount,

      // Unit breakdown
      unitTypeBreakdown,

      // Area stats
      totalUnitArea: Math.round(totalUnitArea * 100) / 100,
      totalLandSize,

      // Building stats
      buildingAgeDistribution,
      elevatorStats,
      buildingTypes,

      // Energy
      energyStandards,

      // Data quality
      propertiesMissingData,

      // Assignments
      topManagers,
      topAccountants,

      // Geographic
      topCities,

      // Recent
      recentProperties,
    };
  }),
});


