import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  MapPin,
  Car,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Edit,
  Layers,
  Eye,
  Send,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { Button, Badge, Card, Input } from '../../../packages/ui';
import { apiClient } from '../../../packages/api-client';
import {
  SessionUser,
  ParkingLocation,
  ParkingBay,
  LocationStatus,
  PropertyType,
} from '../../../packages/contracts';

interface HostSpacesOverviewViewProps {
  currentUser: SessionUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const HostSpacesOverviewView: React.FC<HostSpacesOverviewViewProps> = ({
  currentUser,
  onNavigate,
  onLogout,
}) => {
  const [facilities, setFacilities] = useState<ParkingLocation[]>([]);
  const [baysMap, setBaysMap] = useState<Record<string, ParkingBay[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LocationStatus>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const hostId = currentUser?.id ?? '';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await apiClient.getHostFacilities(hostId);
      setFacilities(data);

      // Load bays for all facilities to compute real stats
      const baysData: Record<string, ParkingBay[]> = {};
      await Promise.all(
        data.map(async (fac) => {
          try {
            const bays = await apiClient.getBays(fac.id);
            baysData[fac.id] = bays;
          } catch {
            baysData[fac.id] = [];
          }
        })
      );
      setBaysMap(baysData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load host facilities.');
    } finally {
      setIsLoading(false);
    }
  }, [hostId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute metrics
  const totalFacilities = facilities.length;
  const activeFacilities = facilities.filter((f) => f.status === LocationStatus.ACTIVE).length;
  const totalBays = Object.values(baysMap).reduce((acc, curr) => acc + curr.length, 0);
  const totalEvBays = Object.values(baysMap).reduce(
    (acc, curr) => acc + curr.filter((b) => b.isEvCharging).length,
    0
  );

  // Filter facilities
  const filteredFacilities = facilities.filter((fac) => {
    const matchesSearch =
      !searchQuery ||
      fac.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fac.address.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fac.address.line1.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || fac.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || fac.propertyType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div
      data-screen-id="pe_hw_02_01"
      className="min-h-screen bg-[#F0F4F3] text-[#132A24] flex flex-col font-sans"
    >
      {/* Top Header */}
      <header className="h-16 bg-[#12211C] text-white px-6 flex items-center justify-between border-b border-[#1e342d] shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/host')}
            className="flex items-center gap-3 text-left focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-[#22C55E] text-[#12211C] font-extrabold flex items-center justify-center shrink-0">
              H
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">
                Host Studio
              </span>
              <span className="text-[10px] text-emerald-400 font-mono tracking-wider uppercase block">
                ParkEazy Host Hub
              </span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <nav className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('/host/spaces')}
              className="px-3 py-1.5 rounded-lg font-medium text-emerald-400 bg-[#1A332B]"
            >
              Facilities & Spaces
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/host/bookings')}
              className="px-3 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-[#1A332B] transition-colors"
            >
              Bookings
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/host/earnings')}
              className="px-3 py-1.5 rounded-lg font-medium text-slate-300 hover:text-white hover:bg-[#1A332B] transition-colors"
            >
              Earnings
            </button>
          </nav>
          <div className="h-4 w-[1px] bg-emerald-950 hidden md:block" />
          <span className="text-slate-300 font-medium">
            {currentUser?.firstName || 'Host Partner'}
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Title & Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#16A34A] uppercase tracking-wider">
              <span>Inventory Management</span>
              <span>•</span>
              <span className="font-mono text-[11px] text-slate-500">pe_hw_02_01</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#132A24] tracking-tight mt-1">
              Facilities &amp; Parking Spaces
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Create, configure, and publish your real parking facilities. Manage individual physical bays, vehicle clearance restrictions, driver access instructions, and photography.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="border-slate-300 hover:bg-slate-100"
            >
              <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="md"
              themeContext="host"
              onClick={() => onNavigate('/host/facilities/new')}
              className="bg-[#22C55E] hover:bg-[#16A34A] text-[#12211C] font-bold shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5 stroke-[3]" />
              New Facility
            </Button>
          </div>
        </div>

        {/* Inventory Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-white border border-[#D8E2DE] shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>Total Facilities</span>
              <Building2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#132A24]">
              {totalFacilities}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {activeFacilities} published &amp; active
            </p>
          </Card>

          <Card className="p-4 bg-white border border-[#D8E2DE] shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>Physical Bays</span>
              <Layers className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#132A24]">
              {totalBays}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Discrete bookable spaces
            </p>
          </Card>

          <Card className="p-4 bg-white border border-[#D8E2DE] shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>EV Charging Bays</span>
              <Zap className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#132A24]">
              {totalEvBays}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Level 2 / Fast charge equipped
            </p>
          </Card>

          <Card className="p-4 bg-white border border-[#D8E2DE] shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
              <span>Active Marketplace</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-[#132A24]">
              {facilities.length > 0
                ? `${Math.round((activeFacilities / facilities.length) * 100)}%`
                : '0%'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Publication readiness rate
            </p>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-[#D8E2DE] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search facilities by name, city, or street address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
            >
              <option value="ALL">All Statuses</option>
              <option value={LocationStatus.ACTIVE}>Active / Published</option>
              <option value={LocationStatus.DRAFT}>Draft (Unpublished)</option>
              <option value={LocationStatus.PENDING_APPROVAL}>Pending Approval</option>
              <option value={LocationStatus.SUSPENDED}>Suspended</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#22C55E]"
            >
              <option value="ALL">All Property Types</option>
              <option value={PropertyType.DRIVEWAY}>Driveway</option>
              <option value={PropertyType.GARAGE}>Garage</option>
              <option value={PropertyType.UNDERGROUND}>Underground Facility</option>
              <option value={PropertyType.PARKING_LOT}>Open Parking Lot</option>
              <option value={PropertyType.COMMERCIAL}>Commercial</option>
            </select>
          </div>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Unable to load facilities</p>
              <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadData}>
              Retry
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#22C55E] animate-spin" />
            <p className="text-sm font-medium text-slate-600">
              Loading facilities and inventory from backend...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredFacilities.length === 0 && (
          <div className="bg-white border border-[#D8E2DE] rounded-2xl p-12 text-center max-w-xl mx-auto shadow-xs">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100 text-emerald-600">
              <Building2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-[#132A24]">
              {facilities.length === 0 ? 'No Parking Facilities Listed Yet' : 'No Facilities Match Your Filter'}
            </h3>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
              {facilities.length === 0
                ? 'Create your first parking facility to define physical parking spaces, vehicle restrictions, and start earning from verified drivers.'
                : 'Try adjusting your search query or status filter to see other facilities in your inventory.'}
            </p>
            {facilities.length === 0 ? (
              <Button
                variant="primary"
                size="md"
                themeContext="host"
                onClick={() => onNavigate('/host/facilities/new')}
                className="mt-6 bg-[#22C55E] hover:bg-[#16A34A] text-[#12211C] font-bold"
              >
                <Plus className="w-4 h-4 mr-1.5 stroke-[3]" />
                Add Your First Facility
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setTypeFilter('ALL');
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Facility Cards Grid */}
        {!isLoading && filteredFacilities.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFacilities.map((facility) => {
              const bays = baysMap[facility.id] || [];
              const evBays = bays.filter((b) => b.isEvCharging).length;
              const isPublished = facility.status === LocationStatus.ACTIVE;

              return (
                <div
                  key={facility.id}
                  className="bg-white rounded-2xl border border-[#D8E2DE] shadow-xs overflow-hidden flex flex-col hover:border-emerald-300 transition-all hover:shadow-md"
                >
                  {/* Card Thumbnail / Header */}
                  <div className="relative h-44 bg-slate-100 overflow-hidden">
                    <img
                      src={facility.imageUrl || '/assets/images/hero_parking_bay_1792157347279.jpg'}
                      alt={facility.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          '/assets/images/hero_parking_bay_1792157347279.jpg';
                      }}
                    />
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <Badge
                        variant={
                          isPublished
                            ? 'success'
                            : facility.status === LocationStatus.PENDING_APPROVAL
                            ? 'info'
                            : 'warning'
                        }
                      >
                        {isPublished ? '● ACTIVE / LIVE' : facility.status}
                      </Badge>
                      {facility.propertyType && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-black/60 text-white backdrop-blur-xs uppercase">
                          {facility.propertyType}
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-slate-800 shadow-xs">
                      ${(facility.hourlyRateCents / 100).toFixed(2)}/hr
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="font-bold text-base text-[#132A24] tracking-tight line-clamp-1">
                        {facility.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">
                          {facility.address.line1}, {facility.address.city}, {facility.address.state}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">
                        {facility.description}
                      </p>
                    </div>

                    {/* Bay Inventory Badges */}
                    <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[11px] text-slate-500 block">Physical Spaces</span>
                        <span className="font-mono font-bold text-slate-800">
                          {bays.length} Bay{bays.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[11px] text-slate-500 block">EV Equipped</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {evBays > 0 ? `${evBays} Point${evBays !== 1 ? 's' : ''}` : 'None'}
                        </span>
                      </div>
                    </div>

                    {/* Actions Grid */}
                    <div className="pt-2 flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onNavigate(`/host/facilities/${facility.id}/layout`)}
                          className="w-full text-xs font-semibold justify-center border-slate-200 hover:bg-emerald-50 hover:text-emerald-800"
                        >
                          <Layers className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Spaces Layout
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onNavigate(`/host/facilities/${facility.id}`)}
                          className="w-full text-xs font-semibold justify-center border-slate-200 hover:bg-slate-50"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1 text-slate-600" />
                          Edit Facility
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onNavigate(`/host/facilities/${facility.id}/preview`)}
                          className="w-full text-xs font-semibold justify-center border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                          Preview
                        </Button>
                        <Button
                          variant={isPublished ? 'outline' : 'primary'}
                          size="sm"
                          themeContext="host"
                          onClick={() => onNavigate(`/host/facilities/${facility.id}/publish`)}
                          className={`w-full text-xs font-bold justify-center ${
                            isPublished
                              ? 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                              : 'bg-[#22C55E] hover:bg-[#16A34A] text-[#12211C]'
                          }`}
                        >
                          {isPublished ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                              Published
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5 mr-1" />
                              Publish...
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
