import React, { useEffect, useMemo, useState } from 'react';
import { ParkEazyApiClient } from '@parkeazy/api-client';
import { Activity, ArrowDownToLine, ArrowLeft, ArrowRight, BadgeCheck, Banknote, Bell, CalendarClock, CarFront, Check, ChevronDown, CircleAlert, Clock3, Download, FileClock, FileSearch, Filter, HelpCircle, LayoutDashboard, LockKeyhole, Mail, MapPin, MoreHorizontal, Search, Settings2, ShieldCheck, SlidersHorizontal, Users, Wallet, X, type LucideIcon } from 'lucide-react';

type Field = { label: string; name: string; type?: string; placeholder?: string; options?: string[]; required?: boolean; maxLength?: number };
type Screen = { id: string; title: string; subtitle: string; group: 'Operations'|'Financials'|'Workspace'; route: string; icon: LucideIcon; description: string; fields?: Field[]; columns?: string[]; actions?: string[] };
const select = (label:string,name:string,options:string[]):Field => ({label,name,type:'select',options});
export const HOST_WORKSPACE_SCREENS: Screen[] = [
{id:'pe_hp_07_01',title:'Host Booking Operations',subtitle:'Day-of operations manifest',group:'Operations',route:'/host/operations/manifest',icon:CalendarClock,description:'Shift-focused manifest for arrivals, active stays, departures and exceptions. Records appear only when a connected service returns them.',columns:['Booking reference','Arrival window','Vehicle','Bay','Status'],actions:['Refresh manifest','Export visible records']},
{id:'pe_hw_04_02',title:'Booking List & Search',subtitle:'Find a reservation',group:'Operations',route:'/host/operations/bookings',icon:FileSearch,description:'Find bookings by reference, vehicle plate or driver details. No sample bookings are inserted.',columns:['Booking reference','Driver / vehicle','Space','Start','End','Status'],actions:['Refresh results','Export visible records']},
{id:'pe_hw_04_03',title:'Booking Details & Commercial Terms',subtitle:'Reservation record',group:'Operations',route:'/host/operations/booking-details',icon:FileClock,description:'Inspect reservation time window, vehicle, price breakdown and terms returned by the booking service.',columns:['Detail','Value'],actions:['Refresh booking']},
{id:'pe_hw_04_04',title:'Arrival & Check-in',subtitle:'Confirm vehicle arrival',group:'Operations',route:'/host/operations/check-in',icon:BadgeCheck,description:'Camera scanning and gate hardware are not connected. A typed code is not treated as a verified scan.',fields:[{label:'Booking reference',name:'bookingReference',placeholder:'Exact booking reference',required:true},{label:'Vehicle registration',name:'vehiclePlate',placeholder:'As shown on reservation',required:true,maxLength:20}],actions:['Validate booking','Confirm check-in']},
{id:'pe_hw_04_05',title:'Active Parking Occupancy',subtitle:'Current bay status',group:'Operations',route:'/host/operations/occupancy',icon:CarFront,description:'Occupancy appears only when the API returns records. No ANPR, RFID, camera or barrier telemetry is configured.',columns:['Bay','Occupancy','Booking reference','Expected departure'],actions:['Refresh occupancy']},
{id:'pe_hw_04_06',title:'Departure & Check-out',subtitle:'Close an active stay',group:'Operations',route:'/host/operations/check-out',icon:ArrowRight,description:'Checkout is not reported as successful unless a supported API confirms it.',fields:[{label:'Booking reference',name:'bookingReference',placeholder:'Exact booking reference',required:true},{label:'Checkout note (optional)',name:'note',placeholder:'Operational note'}],actions:['Find active booking','Confirm check-out']},
{id:'pe_hw_04_07',title:'Extension Requests',subtitle:'Review requested time changes',group:'Operations',route:'/host/operations/extensions',icon:Clock3,description:'Review requested extensions and possible next-booking conflicts. Approval requires a supported API action.',columns:['Booking reference','Requested until','Next booking impact','Decision'],actions:['Refresh requests']},
{id:'pe_hw_04_08',title:'Booking Exceptions',subtitle:'Resolve operational issues',group:'Operations',route:'/host/operations/exceptions',icon:CircleAlert,description:'Track duplicate plates, early arrivals, no-shows and unauthorized entry without inventing events.',columns:['Reported at','Booking / bay','Exception','Status'],actions:['Refresh exceptions']},
{id:'pe_hw_04_09',title:'Operational Activity Audit',subtitle:'Shift handover and gate log',group:'Operations',route:'/host/operations/audit',icon:Activity,description:'Audit events are shown only when returned by connected services; timestamps and operators are not fabricated.',columns:['Timestamp','Event','Reference','Actor','Outcome'],actions:['Refresh activity','Export visible records']},
{id:'pe_hw_05_02',title:'Transaction Ledger',subtitle:'Booking-level earnings',group:'Financials',route:'/host/earnings/ledger',icon:Banknote,description:'Transaction lines must come from the financial ledger service. No synthetic transactions are shown.',columns:['Transaction','Booking','Gross','Fees','Net','Status'],actions:['Refresh ledger','Export visible records']},
{id:'pe_hw_05_03',title:'Platform Fee Breakdown',subtitle:'Commission transparency',group:'Financials',route:'/host/earnings/fees',icon:SlidersHorizontal,description:'Review platform fee terms when supplied by the service; no commission rate is assumed.',columns:['Fee type','Basis','Recorded amount','Effective from'],actions:['Refresh fee schedule']},
{id:'pe_hw_05_04',title:'Payout Account Settings',subtitle:'Settlement destination',group:'Financials',route:'/host/earnings/payout-account',icon:Wallet,description:'No bank details are persisted here. A verified payout-account endpoint is required before saving sensitive details.',fields:[{label:'Account holder',name:'accountHolder',placeholder:'Registered account holder',required:true,maxLength:160},{label:'Bank name',name:'bankName',placeholder:'Bank name',required:true,maxLength:120},{label:'Account number',name:'accountNumber',type:'password',placeholder:'Use a verified secure setup flow',required:true,maxLength:34},{label:'IFSC',name:'ifsc',placeholder:'Bank IFSC',required:true,maxLength:11}],actions:['Validate details','Save payout account']},
{id:'pe_hw_05_05',title:'Payout Schedule',subtitle:'Upcoming settlements',group:'Financials',route:'/host/earnings/schedule',icon:CalendarClock,description:'Settlement dates appear only when provided by the payout service; estimates are never presented as completed transfers.',columns:['Settlement window','Eligible amount','Expected date','Status'],actions:['Refresh schedule','Request payout']},
{id:'pe_hw_05_06',title:'Payout History',subtitle:'Settlement records and receipts',group:'Financials',route:'/host/earnings/history',icon:FileClock,description:'UTR and payout references are shown only when returned by a verified settlement provider.',columns:['Payout reference','Period','Amount','Bank reference','Status'],actions:['Refresh history','Export visible records']},
{id:'pe_hw_05_07',title:'Refunds & Disputes',subtitle:'Adjustments and chargebacks',group:'Financials',route:'/host/earnings/disputes',icon:CircleAlert,description:'Payment-provider integration is not configured; only verified refund/dispute records may appear.',columns:['Case reference','Booking','Reason','Amount','Status'],actions:['Refresh cases']},
{id:'pe_hw_05_08',title:'Earnings Report Centre',subtitle:'Export financial reports',group:'Financials',route:'/host/earnings/reports',icon:Download,description:'Exports include only records actually loaded. A local export is not a certified financial statement.',columns:['Report','Period','Included data','Availability'],actions:['Export visible records']},
{id:'pe_hw_05_09',title:'Financial Exceptions',subtitle:'Reconciliation and payout issues',group:'Financials',route:'/host/earnings/exceptions',icon:CircleAlert,description:'Reconciliation exceptions require financial-service data; bank revalidation requires a configured provider.',columns:['Exception','Reference','Detected at','Required action','Status'],actions:['Refresh exceptions']},
{id:'pe_hw_06_01',title:'Workspace Settings',subtitle:'Host account and business setup',group:'Workspace',route:'/host/settings',icon:Settings2,description:'Edited preferences remain drafts until a supported settings endpoint is connected.',fields:[{label:'Workspace display name',name:'workspaceName',placeholder:'Business or workspace name'},select('Default timezone','timezone',['Asia/Kolkata','Asia/Dubai','UTC']),select('Default currency','currency',['INR — Indian Rupee','AED — UAE Dirham','USD — US Dollar'])],actions:['Save workspace draft']},
{id:'pe_hw_06_02',title:'Business Profile',subtitle:'Registered entity and billing details',group:'Workspace',route:'/host/settings/business',icon:MapPin,description:'Business identity and billing details require a verified settings endpoint before persistence.',fields:[{label:'Registered business name',name:'businessName',placeholder:'As registered',required:true,maxLength:160},{label:'GSTIN / Tax ID',name:'taxId',placeholder:'Tax identifier'},{label:'Billing address',name:'billingAddress',placeholder:'Registered billing address'},{label:'Business email',name:'businessEmail',type:'email',placeholder:'accounts@example.com'}],actions:['Save business profile draft']},
{id:'pe_hw_06_03',title:'Facility Preferences',subtitle:'Operational defaults',group:'Workspace',route:'/host/settings/facilities',icon:Settings2,description:'Facility inventory is loaded from the host facilities API. Booking approval, extension policy and turnaround buffer remain drafts until dedicated settings fields are supported by the server.',columns:['Facility','Location','Listing status','Spaces'],fields:[select('Booking approval','approvalMode',['Manual approval','Automatic approval']),select('Allow extension requests','extensions',['Enabled','Disabled']),select('Turnaround buffer','buffer',['0 minutes','10 minutes','15 minutes','30 minutes'])],actions:['Save facility preferences draft']},
{id:'pe_hw_06_04',title:'Team Members & Invitations',subtitle:'Invite workspace collaborators',group:'Workspace',route:'/host/settings/team',icon:Users,description:'No invitation email is sent until team management and delivery services are configured.',fields:[{label:'Team member email',name:'inviteEmail',type:'email',placeholder:'colleague@example.com',required:true,maxLength:254},select('Facility scope','facilityScope',['All facilities','Choose facilities']),select('Role','inviteRole',['Facility manager','Attendant','Finance viewer'])],actions:['Prepare invitation draft']},
{id:'pe_hw_06_05',title:'Roles & Permissions',subtitle:'Workspace access matrix',group:'Workspace',route:'/host/settings/roles',icon:ShieldCheck,description:'Review intended access rules; this screen does not grant server-side privileges.',columns:['Capability','Owner','Manager','Attendant','Finance viewer'],actions:['Review permissions']},
{id:'pe_hw_06_06',title:'Notification Centre',subtitle:'Operational alerts',group:'Workspace',route:'/host/settings/notifications',icon:Bell,description:'Notifications appear only when returned by connected services.',columns:['Date','Alert','Related record','Priority','Status'],actions:['Refresh notifications','Mark visible as read']},
{id:'pe_hw_06_07',title:'Notification Preferences',subtitle:'Delivery channels and event types',group:'Workspace',route:'/host/settings/notification-preferences',icon:Mail,description:'Delivery preferences are local drafts until the preference endpoint and providers are connected.',fields:[select('Booking updates','bookingUpdates',['Email and in-app','In-app only','Email only','Off']),select('Payout updates','payoutUpdates',['Email and in-app','In-app only','Email only','Off']),select('Security alerts','securityAlerts',['Email and in-app','In-app only','Email only'])],actions:['Save notification preferences draft']},
{id:'pe_hw_06_08',title:'Security & Sessions',subtitle:'Account access controls',group:'Workspace',route:'/host/settings/security',icon:LockKeyhole,description:'Session inventory and two-factor enforcement require server support; remote sessions are not claimed to be terminated.',columns:['Session','Device','Last active','Location','Status'],actions:['Refresh sessions']},
{id:'pe_hw_06_09',title:'Help & Support',subtitle:'Get help with your host account',group:'Workspace',route:'/host/settings/support',icon:HelpCircle,description:'Prepare a support request. No hotline, response-time guarantee or ticket reference is fabricated.',fields:[select('Issue category','category',['Bookings','Space listing','Pricing','Payouts','Account access','Other']),{label:'Booking or facility reference (optional)',name:'reference',placeholder:'Reference ID if applicable'},{label:'Describe the issue',name:'message',type:'textarea',placeholder:'Describe what happened and what you expected',required:true,maxLength:2000}],actions:['Prepare support request draft']},
];
const navGroups = [
{name:'Operations',icon:CalendarClock,routes:HOST_WORKSPACE_SCREENS.filter(s=>s.group==='Operations').map(s=>s.route)},
{name:'Financials',icon:Wallet,routes:HOST_WORKSPACE_SCREENS.filter(s=>s.group==='Financials').map(s=>s.route)},
{name:'Workspace',icon:Settings2,routes:HOST_WORKSPACE_SCREENS.filter(s=>s.group==='Workspace').map(s=>s.route)},
];

export function HostWorkspaceScreen({path,onNavigate}:{path:string;onNavigate:(path:string)=>void}) {
 const screen=HOST_WORKSPACE_SCREENS.find(s=>s.route===path)||HOST_WORKSPACE_SCREENS[0];
 const [search,setSearch]=useState(''); const [status,setStatus]=useState('All statuses'); const [openGroup,setOpenGroup]=useState<string>(screen.group); const [draft,setDraft]=useState<Record<string,string>>({}); const [notice,setNotice]=useState(''); const [busy,setBusy]=useState(false); const [records,setRecords]=useState<Record<string,string>[]>([]); const [earnings,setEarnings]=useState<Record<string,unknown>|null>(null); const [dataError,setDataError]=useState(''); const [saving,setSaving]=useState(false); const Icon=screen.icon; const apiClient=new ParkEazyApiClient();
 const matchedColumns=screen.columns||[];
 const filteredRecords=useMemo(()=>records.filter(row=>{const matchesSearch=!search||Object.values(row).some(value=>String(value||'').toLowerCase().includes(search.toLowerCase()));const matchesStatus=status==='All statuses'||(screen.route==='/host/operations/occupancy'?row['Occupancy']==='Occupied':String(row['Status']||'').toLowerCase()===status.toLowerCase());return matchesSearch&&matchesStatus;}),[records,search,status,screen.route]);
 const actionItems=screen.fields?(screen.actions||[]).slice(0,-1):(screen.actions||['Review details']);
 const loadScreenRecords=async(isCurrent:()=>boolean=()=>true)=>{
  if(isCurrent()){setBusy(true);setDataError('');setNotice('');}
  try {
   if(screen.group==='Financials') {
    const summary=await apiClient.host.getEarnings();
    if(isCurrent())setEarnings(summary as unknown as Record<string,unknown>);
   } else if(isCurrent())setEarnings(null);
   if(screen.route==='/host/operations/extensions'){
    const requests=await apiClient.host.getExtensionRequests();
    const rows:Record<string,string>[] = requests.map((request:any)=>({
     '__requestId':String(request.id||''),
     'Booking reference':String(request.bookingReference||'—'),
     'Requested until':request.requestedEndsAt?new Date(String(request.requestedEndsAt)).toLocaleString():'—',
     'Next booking impact':String(request.status)==='pending'?'Conflict check runs on approval':'Reviewed',
     'Decision':String(request.status||'pending'),
    }));
    if(isCurrent()){setRecords(rows);setNotice(`Loaded ${rows.length} extension request(s) for this host's facilities.`);}return;
   }
   if(screen.route==='/host/operations/occupancy'){
    const occupancy=await apiClient.host.getOccupancy();
    const rows:Record<string,string>[]=[];
    for(const facility of occupancy){for(const space of facility.spaces||[]){rows.push({'Bay':`${facility.facilityName||'Facility'} · ${space.bayIdentifier||'Unnamed bay'}`,'Occupancy':space.isOccupied?'Occupied':'Available','Booking reference':'Not provided by occupancy API','Expected departure':'Not provided by occupancy API'});}}
    if(isCurrent()){setRecords(rows);setNotice(`Occupancy refreshed from the host API. ${rows.length} bay records returned.`);}return;
   }
   if(['/host/operations/manifest','/host/operations/bookings','/host/operations/booking-details'].includes(screen.route)){
    const bookings=await apiClient.host.getBookings();
    const now=Date.now();
    const visible=screen.route==='/host/operations/manifest'?bookings.filter(b=>Date.parse(b.startsAt)<=now+24*60*60*1000&&Date.parse(b.endsAt)>=now-24*60*60*1000):bookings;
    const rows:Record<string,string>[]=visible.map((b):Record<string,string>=>screen.route==='/host/operations/booking-details'?({'Detail':String(b.bookingReference||'—'),'Value':`${b.status} · ${b.vehiclePlate} · ${b.facilityName||'Facility'} · ${new Date(b.startsAt).toLocaleString()} – ${new Date(b.endsAt).toLocaleString()} · Total ₹${Number(b.pricing?.totalAmountInr||0).toFixed(2)}`}):({'Booking reference':String(b.bookingReference||'—'),'Arrival window':`${new Date(b.startsAt).toLocaleString()} – ${new Date(b.endsAt).toLocaleString()}`,'Driver / vehicle':String(b.vehiclePlate||'—'),'Vehicle':String(b.vehiclePlate||'—'),'Space':String(b.bayIdentifier||'—'),'Bay':String(b.bayIdentifier||'—'),'Start':new Date(b.startsAt).toLocaleString(),'End':new Date(b.endsAt).toLocaleString(),'Status':String(b.status||'—')}));
    if(isCurrent()){setRecords(rows);setNotice(`Loaded ${rows.length} host-owned booking record(s) from the host API.`);}return;
   }
   if(screen.route==='/host/operations/audit'){
    const events=await apiClient.host.getAuditEvents();
    const rows=events.map((event:any)=>({'Timestamp':event.createdAt?new Date(String(event.createdAt)).toLocaleString():'—','Event':String(event.eventType||'—'),'Reference':String(event.bookingReference||'—'),'Actor':`${String(event.actorRole||'unknown')}${event.actorId?` · ${String(event.actorId)}`:''}`,'Outcome':'Recorded event'}));
    if(isCurrent()){setRecords(rows);setNotice(`Loaded ${rows.length} host-scoped audit event(s).`);}return;
   }
   if(screen.route==='/host/operations/exceptions'){
    const bookings=await apiClient.host.getBookings();
    const cutoff=Date.now()-15*60*1000;
    const overdue=bookings.filter(booking=>booking.status==='active'&&Date.parse(booking.endsAt)<cutoff);
    const rows=overdue.map(booking=>({'Reported at':new Date().toLocaleString(),'Booking / bay':`${booking.bookingReference} · ${booking.bayIdentifier||'—'}`,'Exception':'Active booking past scheduled end + 15-minute grace','Status':'Needs host review'}));
    if(isCurrent()){setRecords(rows);setNotice(`Derived ${rows.length} overdue-stay exception(s) from active bookings and the 15-minute grace rule.`);}return;
   }
   if(screen.route==='/host/earnings/ledger'){
    const ledger=await apiClient.host.getLedger();
    const rows=ledger.map((entry:any)=>({'Transaction':entry.id,'Booking':entry.bookingReference,'Gross':`₹${Number(entry.grossAmountInr||0).toFixed(2)}`,'Fees':`₹${Number(entry.platformCommissionInr||0).toFixed(2)}`,'Net':`₹${Number(entry.netProceedsInr||0).toFixed(2)}`,'Status':entry.status}));
    if(isCurrent()){setRecords(rows);setNotice(`Loaded ${rows.length} ledger row(s) from the host API.`);}return;
   }
   if(screen.route==='/host/earnings/fees'){
    const ledger=await apiClient.host.getLedger();
    const rows=ledger.map((entry:any)=>({'Fee type':'Recorded platform commission','Basis':String(entry.bookingReference||'Booking'),'Recorded amount':`₹${Number(entry.platformCommissionInr||0).toFixed(2)}`,'Effective from':entry.date?new Date(String(entry.date)).toLocaleDateString():'Booking record'}));
    if(isCurrent()){setRecords(rows);setNotice(`Loaded recorded fee amounts for ${rows.length} booking(s). This is not a future fee schedule.`);}return;
   }
   if(screen.route==='/host/earnings/reports'){
    const ledger=await apiClient.host.getLedger();
    const rows=ledger.map((entry:any)=>({'Report':String(entry.bookingReference||entry.id||'Booking ledger row'),'Period':entry.date?new Date(String(entry.date)).toLocaleDateString():'Date not provided','Included data':`Gross ₹${Number(entry.grossAmountInr||0).toFixed(2)} · Fees ₹${Number(entry.platformCommissionInr||0).toFixed(2)} · Net ₹${Number(entry.netProceedsInr||0).toFixed(2)}`,'Availability':'Exportable loaded ledger row'}));
    if(isCurrent()){setRecords(rows);setNotice(`Prepared ${rows.length} report row(s) from the host ledger. Export includes only returned records.`);}return;
   }
   if(screen.route==='/host/settings/roles'){
    const rows=[
     {'Capability':'View bookings','Owner':'All facilities','Manager':'Assigned facilities','Attendant':'Shift operations','Finance viewer':'No access'},
     {'Capability':'Check-in / check-out','Owner':'All facilities','Manager':'Assigned facilities','Attendant':'Assigned shift','Finance viewer':'No access'},
     {'Capability':'Edit pricing and availability','Owner':'All facilities','Manager':'Assigned facilities','Attendant':'No access','Finance viewer':'No access'},
     {'Capability':'View earnings and ledger','Owner':'All facilities','Manager':'Assigned facilities','Attendant':'No access','Finance viewer':'Read-only'},
     {'Capability':'Manage payout settings','Owner':'Allowed with verification','Manager':'No access','Attendant':'No access','Finance viewer':'No access'},
     {'Capability':'Manage team access','Owner':'Allowed','Manager':'No access','Attendant':'No access','Finance viewer':'No access'},
    ];
    if(isCurrent()){setRecords(rows);setNotice('Showing the proposed access matrix for review only. Server-side role grants are not changed by this screen.');}return;
   }
   if(screen.route==='/host/earnings/history'){
    const payouts=await apiClient.host.getPayouts();
    const rows=payouts.map((payout:any)=>({'Payout reference':String(payout.id||payout.reference||'—'),'Period':String(payout.periodLabel||payout.period||'—'),'Amount':`₹${Number(payout.amountInr||payout.amount||0).toFixed(2)}`,'Bank reference':String(payout.utr||payout.bankReference||'—'),'Status':String(payout.status||'—')}));
    if(isCurrent()){setRecords(rows);setNotice(`Loaded ${rows.length} payout record(s) from the settlement service.`);}return;
   }
   if(screen.route==='/host/earnings/schedule'){
    const payouts=await apiClient.host.getPayouts();
    const rows=payouts.filter((payout:any)=>!['paid','completed','failed','cancelled'].includes(String(payout.status||'').toLowerCase())).map((payout:any)=>({'Settlement window':String(payout.periodLabel||payout.period||'—'),'Eligible amount':`₹${Number(payout.amountInr||payout.amount||0).toFixed(2)}`,'Expected date':payout.expectedAt?new Date(String(payout.expectedAt)).toLocaleDateString():'Not provided','Status':String(payout.status||'—')}));
    if(isCurrent()){setRecords(rows);setNotice(`Loaded ${rows.length} unsettled payout record(s). Dates are shown only when provided by the settlement service.`);}return;
   }
   if(screen.route==='/host/earnings/exceptions'){
    // Reconcile only what the current ledger can prove. Do not infer that a completed
    // booking is unpaid merely because a payout-provider endpoint is unavailable.
    const ledger=await apiClient.host.getLedger();
    const reviewStatuses=new Set(['failed','reversed','disputed','pending_review','refund_pending','refunded','chargeback']);
    const rows:Record<string,string>[]=ledger.filter((entry:any)=>reviewStatuses.has(String(entry.status||'').toLowerCase())).map((entry:any)=>({
     'Exception':String(entry.status||'Requires review'),
     'Reference':String(entry.bookingReference||entry.id||'—'),
     'Detected at':entry.date?new Date(String(entry.date)).toLocaleString():'—',
     'Required action':'Review the source booking and verified payment-provider records',
     'Status':'Ledger review required',
    }));
    if(isCurrent()){
     setRecords(rows);
     setNotice(`Ledger review found ${rows.length} record(s) with exception statuses. Bank settlement reconciliation is unavailable until a persistent settlement provider supplies payout and bank-reference records; no unpaid status has been inferred.`);
    }return;
   }
   if(screen.route==='/host/earnings/disputes'){
    // Never fabricate refund/dispute cases from booking rows.
    try {
     const cases=await apiClient.host.getPayouts();
     const rows:Record<string,string>[]=cases.filter((item:any)=>['refund','dispute','chargeback','reversed'].includes(String(item.type||item.kind||item.status||'').toLowerCase())).map((item:any)=>({'Case reference':String(item.id||item.reference||'—'),'Booking':String(item.bookingReference||item.bookingId||'—'),'Reason':String(item.reason||'Not provided by settlement service'),'Amount':`₹${Number(item.amountInr||item.amount||0).toFixed(2)}`,'Status':String(item.status||'—')}));
     if(isCurrent()){setRecords(rows);setNotice(`Loaded ${rows.length} verified adjustment case(s) from the configured settlement service.`);}
    } catch {
     if(isCurrent()){setRecords([]);setNotice('Refunds and disputes are not yet available: no persistent payment/settlement provider is configured. No cases were fabricated and no refund or dispute action was taken.');}
    }return;
   }
   if(screen.route==='/host/settings/facilities'){
    const facilities=await apiClient.facilities.list();
    const rows=facilities.map((facility:any)=>({'Facility':String(facility.name||facility.businessName||facility.id||'Unnamed facility'),'Location':[facility.addressLine1,facility.city,facility.state].filter(Boolean).join(', ')||'Address not provided','Listing status':String(facility.status||'Unknown'),'Spaces':String(facility.totalSpaces??facility.spaceCount??'Not provided')}));
    if(isCurrent()){setRecords(rows);setNotice(`Loaded ${rows.length} facility record(s) from the existing facilities API. Preference fields remain drafts until supported by the server.`);}
    return;
   }
   if(screen.route==='/host/settings/business'){
    const profile=await apiClient.users.getHostProfile();
    if(isCurrent()&&profile){setDraft(p=>({...p,businessName:profile.businessName||'',taxId:(profile as any).panNumber||'',businessEmail:(profile as any).businessEmail||'',billingAddress:(profile as any).billingAddress||''}));setNotice('Loaded saved business-profile fields. Unsupported fields remain editable drafts until their API is available.');}
    else if(isCurrent()){setNotice('No saved host business profile was returned. Enter details to begin.');}
    if(isCurrent())setRecords([]);
    return;
   }
   if(isCurrent()){setRecords([]);setNotice('No live data loader is available for this screen yet. No sample records were inserted.');}
  } catch(error) {if(isCurrent()){setRecords([]);setDataError(error instanceof Error?error.message:'Unable to load records from the host API.');}}
  finally {if(isCurrent())setBusy(false);}
 };
 useEffect(()=>{let active=true;setSearch('');setStatus('All statuses');setDraft(()=>{try{if(typeof window==='undefined'||screen.route==='/host/earnings/payout-account'||screen.route==='/host/settings/support')return {};const raw=window.localStorage.getItem(`parkeazy:host:draft:${screen.route}`);return raw?JSON.parse(raw) as Record<string,string>:{};}catch{return {};}});setNotice('');setDataError('');if(['/host/operations/occupancy','/host/operations/manifest','/host/operations/bookings','/host/operations/booking-details','/host/operations/extensions','/host/operations/audit','/host/operations/exceptions','/host/earnings/ledger','/host/earnings/history','/host/earnings/schedule','/host/earnings/exceptions','/host/earnings/fees','/host/earnings/disputes','/host/earnings/reports','/host/earnings/payout-account','/host/settings/business','/host/settings/roles','/host/settings/facilities'].includes(screen.route)){void loadScreenRecords(()=>active);}else{setRecords([]);setBusy(false);}return()=>{active=false;};},[screen.route]);
 const decideExtension=async(requestId:string,decision:'approve'|'reject')=>{
  if(!requestId){setDataError('This request has no valid server identifier.');return;}
  setBusy(true);setDataError('');setNotice('');
  try{
   await apiClient.host.decideExtensionRequest(requestId,decision);
   setNotice(decision==='approve'?'Extension approved. The API confirmed the decision and updated the booking.':'Extension request rejected. The API confirmed the decision.');
   await loadScreenRecords();
  }catch(error){setDataError(error instanceof Error?error.message:'Unable to record the extension decision. No success is assumed.');}
  finally{setBusy(false);}
 };
 const act=async(action:string)=>{
  if(/refresh/i.test(action)){await loadScreenRecords();return;}
  if(/export/i.test(action)){
   const visible=filteredRecords;
   if(!visible.length){setNotice('There are no loaded records to export.');return;}
   const columns=screen.columns||Object.keys(visible[0]);
   const escapeCsv=(value:unknown)=>`"${String(value??'').replace(/"/g,'""')}"`;
   const csv=[columns.map(escapeCsv).join(','),...visible.map(row=>columns.map(column=>escapeCsv(row[column])).join(','))].join('\r\n');
   const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`parkeazy-${screen.id}.csv`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);setNotice(`Exported ${visible.length} loaded record(s) to CSV.`);return;
  }
  if(/approve extension|reject extension|review extension/i.test(action)){
   setDataError('Select Approve or Reject on the specific pending request row. No request was changed by this generic action.');
   return;
  }
  if(/request payout/i.test(action)){
   if(!window.confirm('Submit a payout request to the host API? The request will only succeed if payout eligibility and a settlement provider are configured.'))return;
   setBusy(true);setDataError('');setNotice('');
   try{
    const payout=await apiClient.host.requestPayout();
    setNotice(`Payout request accepted by the API: ${String((payout as any).id||(payout as any).reference||'request reference unavailable')}. This is not confirmation of a bank transfer.`);
    await loadScreenRecords();
   }catch(error){setDataError(error instanceof Error?error.message:'The payout request was not confirmed by the API. No transfer is assumed.');}
   finally{setBusy(false);}
   return;
  }
  if(/confirm check-in|confirm check-out|validate booking|find active booking/i.test(action)){
   const reference=draft.bookingReference?.trim().toLowerCase();
   if(!reference){setDataError('Enter the exact booking reference first.');return;}
   setBusy(true);setDataError('');
   try{
    const bookings=await apiClient.host.getBookings();
    const booking=bookings.find(item=>item.bookingReference.trim().toLowerCase()===reference);
    if(!booking){setDataError('No booking with that reference was found among this host’s bookings.');return;}
    if(screen.route==='/host/operations/check-in'){
     if(draft.vehiclePlate?.trim().toUpperCase()!==booking.vehiclePlate.toUpperCase()){setDataError('Vehicle registration does not match the booking. No check-in was recorded.');return;}
     if(/validate booking/i.test(action)){setNotice(`Booking validated: ${booking.bookingReference} · ${booking.status} · ${booking.vehiclePlate} · ${booking.facilityName||'Facility'} · ${new Date(booking.startsAt).toLocaleString()}. No check-in has been recorded yet.`);return;}
     const updated=await apiClient.host.checkIn(booking.id);setNotice(`Check-in confirmed by the host API for ${updated.bookingReference}.`);setDraft({});return;
    }
    if(screen.route==='/host/operations/check-out'){
     if(booking.status!=='active'){setDataError(`This booking is '${booking.status}'. Only an active booking can be checked out.`);return;}
     if(/find active booking/i.test(action)){setNotice(`Active booking found: ${booking.bookingReference} · ${booking.vehiclePlate} · expected end ${new Date(booking.endsAt).toLocaleString()}. No check-out has been recorded yet.`);return;}
     const updated=await apiClient.host.checkOut(booking.id);setNotice(`Check-out confirmed by the host API for ${updated.bookingReference}.`);setDraft({});return;
    }
   }catch(error){setDataError(error instanceof Error?error.message:'The booking operation could not be verified.');}
   finally{setBusy(false);}
   return;
  }
  if(/save business profile draft/i.test(action)&&screen.route==='/host/settings/business'){
   if(!draft.businessName?.trim()){setNotice('Enter the registered business name before saving.');return;}
   setSaving(true);setDataError('');
   try {await apiClient.users.updateHostProfile({businessName:draft.businessName.trim(),panNumber:draft.taxId?.trim()||undefined});setNotice('Business name and tax ID saved through the existing host profile API. Billing address and business email remain local drafts.');}
   catch(error){setDataError(error instanceof Error?error.message:'Unable to save the business profile.');}
   finally{setSaving(false);}
   return;
  }
  if(/save|prepare invitation|prepare support/i.test(action)){if(screen.route==='/host/earnings/payout-account'||screen.route==='/host/settings/support'){setNotice('Draft captured for this session only. Sensitive payout details and support messages are not stored in browser storage or sent to a service.');return;}try{window.localStorage.setItem(`parkeazy:host:draft:${screen.route}`,JSON.stringify(draft));setNotice('Workspace draft saved in this browser only. It is not yet synchronized to the server.');}catch{setNotice('Draft is available for this session, but browser storage is unavailable. Nothing was sent to the server.');}return;}
  setNotice('Review-only action. No live permissions, bookings or account settings were changed.');
 };
 return <div className="host-workspace-shell">
  <aside className="host-sidebar"><button className="host-brand" onClick={()=>onNavigate('/host/')}><span className="host-brand-mark">P</span><span><strong>ParkEazy</strong><small>HOST WORKSPACE</small></span></button><div className="host-sidebar-label">WORKSPACE</div><button className="host-nav-item" onClick={()=>onNavigate('/host/')}><LayoutDashboard size={17}/> Dashboard</button>
   {navGroups.map(g=>{const GIcon=g.icon;const active=g.routes.includes(screen.route);const expanded=openGroup===g.name;return <div className="host-nav-group" key={g.name}><button className={`host-nav-heading ${active?'active':''}`} onClick={()=>setOpenGroup(expanded?'':String(g.name))} aria-expanded={expanded}><GIcon size={16}/><span>{g.name}</span><ChevronDown size={14}/></button>{expanded&&g.routes.map(route=>{const item=HOST_WORKSPACE_SCREENS.find(s=>s.route===route);return item?<button key={route} className={`host-subnav-item ${route===screen.route?'selected':''}`} onClick={()=>onNavigate(route)}>{item.title}</button>:null;})}</div>;})}
   <div className="host-sidebar-footer"><span className="host-avatar">H</span><span><strong>Host workspace</strong><small>Connected account</small></span><MoreHorizontal size={18}/></div>
  </aside>
  <main className="host-workspace-main"><header className="host-topbar"><div className="host-breadcrumb"><span>Host workspace</span><ArrowRight size={13}/><span>{screen.group}</span><ArrowRight size={13}/><strong>{screen.title}</strong></div><div className="host-top-actions"><span className="host-environment"><span/> Connected UI · live data varies</span><button className="host-icon-button" aria-label="Notifications" onClick={()=>onNavigate('/host/settings/notifications')}><Bell size={18}/></button><button className="host-avatar host-avatar-small" onClick={()=>onNavigate('/host/settings')}>H</button></div></header>
   <div className="host-page-content"><div className="host-page-heading"><div className="host-title-icon"><Icon size={22}/></div><div className="host-title-copy"><div className="host-eyebrow">{screen.id} <span>•</span> {screen.group}</div><h1>{screen.title}</h1><p>{screen.subtitle}</p></div><button className="host-button host-button-secondary" onClick={()=>onNavigate('/host/')}><ArrowLeft size={16}/> Dashboard</button></div>
    <section className="host-context-banner"><div className="host-context-icon"><ShieldCheck size={19}/></div><div><strong>Operational integrity is enabled</strong><p>{screen.description}</p></div></section>
    {notice&&<div className="host-notice" role="status"><Check size={17}/><span>{notice}</span><button aria-label="Dismiss notice" onClick={()=>setNotice('')}><X size={16}/></button></div>}{dataError&&<div className="host-data-error" role="alert"><CircleAlert size={17}/><span>{dataError}</span><button aria-label="Dismiss error" onClick={()=>setDataError('')}><X size={16}/></button></div>}
    {screen.group==='Financials'&&<section className="host-finance-summary" aria-label="Earnings summary"><div className="host-card-heading"><div><h2>Verified earnings overview</h2><p>Calculated by the host API from completed bookings and stored fee amounts. Pending balance is not a confirmed payout.</p></div><button className="host-button host-button-secondary" onClick={()=>void loadScreenRecords()} disabled={busy}><Activity size={15}/> Refresh summary</button></div><div className="host-finance-kpis">{[{label:'Gross earnings',value:earnings?`₹${Number(earnings.grossEarningsInr||0).toFixed(2)}`:'—'},{label:'Platform fees',value:earnings?`₹${Number(earnings.platformCommissionInr||0).toFixed(2)}`:'—'},{label:'Net before payout',value:earnings?`₹${Number(earnings.netPayoutInr||0).toFixed(2)}`:'—'},{label:'Pending balance',value:earnings?`₹${Number(earnings.pendingBalanceInr||0).toFixed(2)}`:'—'}].map(item=><div className="host-finance-kpi" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div></section>}
    {screen.fields&&<section className="host-card"><div className="host-card-heading"><div><h2>{screen.group==='Workspace'?'Configuration':screen.group==='Financials'?'Secure account details':'Operation details'}</h2><p>{screen.route==='/host/settings/business'?'Business name and tax ID use the existing host profile API. Billing address and business email remain local drafts unless the API returns/persists them.':screen.route==='/host/earnings/payout-account'?'Sensitive bank details are not stored or submitted here. Use the verified payout setup flow when a provider is configured.':'Draft values remain local to this screen and are not persisted to the server.'}</p></div><span className="host-draft-pill">{screen.route==='/host/settings/business'?'Partial API':'Draft mode'}</span></div><form className="host-form-grid" onSubmit={e=>{e.preventDefault();act(screen.actions?.[screen.actions.length-1]||'Save draft');}}>
      {screen.fields.map(f=><label className={`host-field ${f.type==='textarea'?'host-field-wide':''}`} key={f.name}><span>{f.label}</span>{f.type==='select'?<select value={draft[f.name]||f.options?.[0]||''} onChange={e=>setDraft(p=>({...p,[f.name]:e.target.value}))}>{f.options?.map(o=><option key={o}>{o}</option>)}</select>:f.type==='textarea'?<textarea rows={4} required={f.required} maxLength={f.maxLength} value={draft[f.name]||''} placeholder={f.placeholder} onChange={e=>setDraft(p=>({...p,[f.name]:e.target.value}))}/>:<input type={f.type||'text'} required={f.required} maxLength={f.maxLength} value={draft[f.name]||''} placeholder={f.placeholder} onChange={e=>setDraft(p=>({...p,[f.name]:e.target.value}))}/>}</label>)}
      <div className="host-form-actions"><button className="host-button host-button-primary" type="submit" disabled={saving}><Check size={16}/>{saving?'Saving…':screen.actions?.[screen.actions.length-1]||'Save draft'}</button><button className="host-button host-button-secondary" type="button" onClick={()=>{setDraft({});try{if(screen.route!='/host/earnings/payout-account'&&screen.route!='/host/settings/support')window.localStorage.removeItem(`parkeazy:host:draft:${screen.route}`);}catch{}setNotice('Draft fields cleared from this screen and browser storage where applicable. No server data was changed.');}}>Reset draft</button></div>
    </form></section>}
    {screen.columns&&<section className="host-card"><div className="host-card-heading"><div><h2>{screen.group==='Operations'?'Operational records':screen.group==='Financials'?'Financial records':'Workspace records'}</h2><p>Records are not populated with sample or placeholder transactions.</p></div><div className="host-table-tools"><label className="host-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search records" aria-label="Search records"/></label>{screen.route==='/host/operations/occupancy'&&<button className="host-button host-button-secondary" onClick={()=>setStatus(s=>s==='All statuses'?'Occupied only':'All statuses')}><Filter size={15}/>{status}</button>}</div></div>
      <div className="host-table-wrap"><table className="host-table"><thead><tr>{matchedColumns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{filteredRecords.length>0?filteredRecords.map((row,index)=><tr key={`${row['Bay']}-${index}`}>{matchedColumns.map(column=><td key={column} className="host-data-cell">{screen.route==='/host/operations/extensions'&&column==='Decision'&&row['Decision']==='pending'?<div className="host-action-row"><button className="host-button host-button-primary" disabled={busy} onClick={()=>void decideExtension(row['__requestId'],'approve')}>Approve</button><button className="host-button host-button-secondary" disabled={busy} onClick={()=>void decideExtension(row['__requestId'],'reject')}>Reject</button></div>:row[column]||'—'}</td>)}</tr>):<tr><td colSpan={Math.max(matchedColumns.length,1)}><div className="host-empty-state"><div className="host-empty-icon"><FileSearch size={22}/></div><strong>{busy?'Loading…':'No records returned'}</strong><p>{dataError?'The API request failed. Review the error above and retry.':'Connect to the relevant API and refresh to load verified records. This screen does not seed sample data.'}</p><button className="host-button host-button-secondary" onClick={()=>act('Refresh records')}><Activity size={15}/> {busy?'Loading…':'Refresh data'}</button></div></td></tr>}</tbody></table></div><div className="host-table-footer"><span>{filteredRecords.length} records shown · No sample data</span><span>{matchedColumns.length} columns · Search filters loaded records</span></div>
    </section>}
    {actionItems.length>0&&<section className="host-card host-next-actions"><div><h2>Available actions</h2><p>Actions stay within the current integration boundary.</p></div><div className="host-action-row">{actionItems.map(a=><button key={a} className="host-button host-button-secondary" disabled={busy||saving} onClick={()=>act(a)}>{/export/i.test(a)?<ArrowDownToLine size={16}/>:<Activity size={16}/>} {a}</button>)}</div></section>}
    <footer className="host-page-footer"><span>ParkEazy Host Portal</span><span>Screen {screen.id} · API-backed data only · <button onClick={()=>onNavigate('/host/settings/support')}>Need help?</button></span></footer>
   </div>
  </main>
 </div>;
}
