// ─────────────────────────────────────────────────────────────────────────────
// Fixture data for the Ashmeet SMMA demo.
// Anchor date: 23 September 2026.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  User, Client, ContentItem, Shoot, ShootItem, DeliverableVersion,
  Comment, ApprovalLink, PostSchedule, ActivityLog, LibraryAsset,
  ClientScope, MonthlyPlan, RawFile, UploadSession, Agency,
} from '@/types/database'

// ── Agencies ──────────────────────────────────────────────────────────────────

export const agencies: Agency[] = [
  { id: 'ag-1', name: 'Ashmeet SMMA', slug: 'ashmeet-smma', status: 'active', logo_url: null, created_at: '2026-01-01T00:00:00Z' },
  { id: 'ag-2', name: 'Northside Social', slug: 'northside-social', status: 'active', logo_url: null, created_at: '2026-06-01T00:00:00Z' },
]

// ── Users ─────────────────────────────────────────────────────────────────────

export const users: User[] = [
  { id: 'u-1', agency_id: 'ag-1', email: 'ashmeet@onlincs.com', full_name: 'Ashmeet Chaurasia', initials: 'AC', role: 'admin', avatar_gradient: 'linear-gradient(140deg,#8F80F7,#5A4AD8)', phone: '+919876543210', is_active: true },
  { id: 'u-2', agency_id: 'ag-1', email: 'jaspreet@ashmeetsmma.com', full_name: 'Jaspreet Kaur', initials: 'JK', role: 'brand_manager', avatar_gradient: 'linear-gradient(140deg,#8F80F7,#5A4AD8)', phone: '+919876543211', is_active: true },
  { id: 'u-3', agency_id: 'ag-1', email: 'nikhil@ashmeetsmma.com', full_name: 'Nikhil Sharma', initials: 'NS', role: 'brand_manager', avatar_gradient: 'linear-gradient(140deg,#F8A0BC,#DF5A86)', phone: '+919876543212', is_active: true },
  { id: 'u-4', agency_id: 'ag-1', email: 'manreet@ashmeetsmma.com', full_name: 'Manreet Gill', initials: 'MG', role: 'brand_manager', avatar_gradient: 'linear-gradient(140deg,#63DCA9,#1FA772)', phone: '+919876543213', is_active: true },
  { id: 'u-5', agency_id: 'ag-1', email: 'rohit@ashmeetsmma.com', full_name: 'Rohit Bansal', initials: 'RB', role: 'editor', avatar_gradient: 'linear-gradient(140deg,#62A0F2,#14539F)', phone: '+919876543214', is_active: true },
  { id: 'u-6', agency_id: 'ag-1', email: 'simran@ashmeetsmma.com', full_name: 'Simran Kaur', initials: 'SK', role: 'editor', avatar_gradient: 'linear-gradient(140deg,#F8A0BC,#DF5A86)', phone: '+919876543215', is_active: true },
  { id: 'u-7', agency_id: 'ag-1', email: 'harpreet@ashmeetsmma.com', full_name: 'Harpreet Singh', initials: 'HS', role: 'cameraman', avatar_gradient: 'linear-gradient(140deg,#8F80F7,#5A4AD8)', phone: '+919876543216', is_active: true },
  { id: 'u-8', agency_id: 'ag-1', email: 'vikram@ashmeetsmma.com', full_name: 'Vikram Rana', initials: 'VR', role: 'cameraman', avatar_gradient: 'linear-gradient(140deg,#63DCA9,#1FA772)', phone: '+919876543217', is_active: true },
]

// ── Clients ───────────────────────────────────────────────────────────────────

export const clients: Client[] = [
  { id: 'cl-1', agency_id: 'ag-1', code: 'RAM-01', name: 'Ramana Dental', handle: '@ramanadental', niche: 'Healthcare', manager_id: 'u-2', status: 'active', onboarded_at: '2026-08-01', drive_folder_id: null, created_at: '2026-08-01T00:00:00Z' },
  { id: 'cl-2', agency_id: 'ag-1', code: 'GRV-02', name: 'Grover Motors', handle: '@grovermotors', niche: 'Automotive', manager_id: 'u-2', status: 'active', onboarded_at: '2026-07-15', drive_folder_id: null, created_at: '2026-07-15T00:00:00Z' },
  { id: 'cl-3', agency_id: 'ag-1', code: 'SDH-03', name: 'Sandhu Interiors', handle: '@sandhu.interiors', niche: 'Interiors', manager_id: 'u-3', status: 'active', onboarded_at: '2026-08-10', drive_folder_id: null, created_at: '2026-08-10T00:00:00Z' },
  { id: 'cl-4', agency_id: 'ag-1', code: 'KHN-04', name: 'Khanna Jewellers', handle: '@khannajewellers', niche: 'Retail', manager_id: 'u-3', status: 'active', onboarded_at: '2026-09-01', drive_folder_id: null, created_at: '2026-09-01T00:00:00Z' },
  { id: 'cl-5', agency_id: 'ag-1', code: 'BSL-05', name: 'Basil Cafe', handle: '@basil.ldh', niche: 'Food & Beverage', manager_id: 'u-4', status: 'active', onboarded_at: '2026-08-20', drive_folder_id: null, created_at: '2026-08-20T00:00:00Z' },
  { id: 'cl-6', agency_id: 'ag-1', code: 'VRD-06', name: 'Verdant Gym', handle: '@verdant.fit', niche: 'Fitness', manager_id: 'u-4', status: 'onboarding', onboarded_at: '2026-09-15', drive_folder_id: null, created_at: '2026-09-15T00:00:00Z' },
]

// ── Content Items ─────────────────────────────────────────────────────────────

export const contentItems: ContentItem[] = [
  { id: 'ci-1', agency_id: 'ag-1', client_id: 'cl-1', title: 'Smile makeover before/after reel', slug: 'ci-ramanadental-001', type: 'reel', concept: 'Before/after transformation reel', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-10', planned_time: '09:00', status: 'with_editor', assigned_editor_id: 'u-5', deadline: '2026-09-18', created_by: 'u-2', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-01T09:00:00Z' },
  { id: 'ci-2', agency_id: 'ag-1', client_id: 'cl-1', title: 'Root canal myths busted', slug: 'ci-ramanadental-002', type: 'reel', concept: 'Myth-busting educational reel', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-12', planned_time: '14:00', status: 'with_client', assigned_editor_id: 'u-5', deadline: '2026-09-20', created_by: 'u-2', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-01T09:30:00Z' },
  { id: 'ci-3', agency_id: 'ag-1', client_id: 'cl-1', title: 'Why Ramana Dental?', slug: 'ci-ramanadental-003', type: 'post', concept: 'Brand trust testimonial', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-08', planned_time: '10:00', status: 'internally_approved', assigned_editor_id: 'u-5', deadline: '2026-09-16', created_by: 'u-2', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-08-25T09:00:00Z' },
  { id: 'ci-4', agency_id: 'ag-1', client_id: 'cl-1', title: 'Teeth whitening tips', slug: 'ci-ramanadental-004', type: 'carousel', concept: '5 tips for whiter teeth', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-14', planned_time: '11:00', status: 'cut_submitted', assigned_editor_id: 'u-5', deadline: '2026-09-22', created_by: 'u-2', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-03T08:00:00Z' },
  { id: 'ci-5', agency_id: 'ag-1', client_id: 'cl-1', title: 'New patient offer', slug: 'ci-ramanadental-005', type: 'story', concept: 'Flash discount story', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-15', planned_time: '16:00', status: 'scheduled', assigned_editor_id: 'u-5', deadline: '2026-09-25', created_by: 'u-2', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-04T09:00:00Z' },
  { id: 'ci-6', agency_id: 'ag-1', client_id: 'cl-2', title: 'Showroom walkthrough reel', slug: 'ci-grovermotors-001', type: 'reel', concept: 'Walkthrough of new showroom', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-01', planned_time: '10:00', status: 'posted', assigned_editor_id: 'u-5', deadline: '2026-09-08', created_by: 'u-2', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-02T10:00:00Z' },
  { id: 'ci-7', agency_id: 'ag-1', client_id: 'cl-2', title: 'Service package explainer', slug: 'ci-grovermotors-002', type: 'reel', concept: 'Packages breakdown reel', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-05', planned_time: '09:00', status: 'scheduled', assigned_editor_id: 'u-6', deadline: '2026-09-12', created_by: 'u-2', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-08-20T10:00:00Z' },
  { id: 'ci-8', agency_id: 'ag-1', client_id: 'cl-2', title: 'Testimonial — Mr. Gupta', slug: 'ci-grovermotors-003', type: 'post', concept: 'Customer testimonial post', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-03', planned_time: '11:00', status: 'posted', assigned_editor_id: 'u-6', deadline: '2026-09-10', created_by: 'u-2', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-08-22T09:00:00Z' },
  { id: 'ci-9', agency_id: 'ag-1', client_id: 'cl-2', title: 'Festival offers carousel', slug: 'ci-grovermotors-004', type: 'carousel', concept: 'Diwali offer cards', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-07', planned_time: '13:00', status: 'posted', assigned_editor_id: 'u-5', deadline: '2026-09-14', created_by: 'u-2', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-05T11:00:00Z' },
  { id: 'ci-10', agency_id: 'ag-1', client_id: 'cl-2', title: 'Behind the scenes', slug: 'ci-grovermotors-005', type: 'story', concept: 'Factory visit BTS', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-09', planned_time: '15:00', status: 'posted', assigned_editor_id: 'u-6', deadline: '2026-09-16', created_by: 'u-2', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-07T10:00:00Z' },
  { id: 'ci-11', agency_id: 'ag-1', client_id: 'cl-3', title: 'Modular kitchen reveal', slug: 'ci-sandhuinteriors-001', type: 'reel', concept: 'Reveal of modular kitchen', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-11', planned_time: '09:00', status: 'raw_uploaded', assigned_editor_id: 'u-5', deadline: '2026-09-19', created_by: 'u-3', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-08T09:00:00Z' },
  { id: 'ci-12', agency_id: 'ag-1', client_id: 'cl-3', title: 'Client testimonial — Mrs. Bedi', slug: 'ci-sandhuinteriors-002', type: 'reel', concept: 'Testimonial video', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-13', planned_time: '10:00', status: 'shoot_scheduled', assigned_editor_id: 'u-5', deadline: '2026-09-21', created_by: 'u-3', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-09T10:00:00Z' },
  { id: 'ci-13', agency_id: 'ag-1', client_id: 'cl-3', title: 'Before/after living room', slug: 'ci-sandhuinteriors-003', type: 'post', concept: 'Transformation post', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-15', planned_time: '11:00', status: 'planned', assigned_editor_id: null, deadline: '2026-09-23', created_by: 'u-3', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-10T11:00:00Z' },
  { id: 'ci-14', agency_id: 'ag-1', client_id: 'cl-4', title: 'Diwali offer reel', slug: 'ci-khannajewellers-001', type: 'reel', concept: 'Diwali special reel', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-05', planned_time: '09:00', status: 'client_changes', assigned_editor_id: 'u-5', deadline: '2026-09-10', created_by: 'u-3', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-01T08:00:00Z' },
  { id: 'ci-15', agency_id: 'ag-1', client_id: 'cl-4', title: 'Gold rate update post', slug: 'ci-khannajewellers-002', type: 'post', concept: 'Daily gold rate post', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-06', planned_time: '10:00', status: 'posted', assigned_editor_id: 'u-5', deadline: '2026-09-11', created_by: 'u-3', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-02T09:00:00Z' },
  { id: 'ci-16', agency_id: 'ag-1', client_id: 'cl-4', title: 'Bridal collection carousel', slug: 'ci-khannajewellers-003', type: 'carousel', concept: 'New bridal range', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-08', planned_time: '11:00', status: 'with_client', assigned_editor_id: 'u-5', deadline: '2026-09-13', created_by: 'u-3', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-03T10:00:00Z' },
  { id: 'ci-17', agency_id: 'ag-1', client_id: 'cl-4', title: 'Custom design reel', slug: 'ci-khannajewellers-004', type: 'reel', concept: 'Custom jewellery process', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-09', planned_time: '12:00', status: 'posted', assigned_editor_id: 'u-6', deadline: '2026-09-14', created_by: 'u-3', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-04T10:00:00Z' },
  { id: 'ci-18', agency_id: 'ag-1', client_id: 'cl-5', title: 'New season menu reel', slug: 'ci-basilcafe-001', type: 'reel', concept: 'New autumn menu reveal', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-07', planned_time: '09:00', status: 'internally_approved', assigned_editor_id: 'u-6', deadline: '2026-09-14', created_by: 'u-4', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-02T09:00:00Z' },
  { id: 'ci-19', agency_id: 'ag-1', client_id: 'cl-5', title: "Barista's pick", slug: 'ci-basilcafe-002', type: 'reel', concept: "Staff favourite drinks", script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-10', planned_time: '10:00', status: 'with_editor', assigned_editor_id: 'u-6', deadline: '2026-09-18', created_by: 'u-4', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-05T10:00:00Z' },
  { id: 'ci-20', agency_id: 'ag-1', client_id: 'cl-5', title: 'Weekend brunch post', slug: 'ci-basilcafe-003', type: 'post', concept: 'Brunch menu highlights', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-04', planned_time: '11:00', status: 'posted', assigned_editor_id: 'u-5', deadline: '2026-09-11', created_by: 'u-4', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-08-25T11:00:00Z' },
  { id: 'ci-21', agency_id: 'ag-1', client_id: 'cl-5', title: 'Latte art carousel', slug: 'ci-basilcafe-004', type: 'carousel', concept: 'Latte art series', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-05', planned_time: '12:00', status: 'posted', assigned_editor_id: 'u-6', deadline: '2026-09-12', created_by: 'u-4', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-08-27T10:00:00Z' },
  { id: 'ci-22', agency_id: 'ag-1', client_id: 'cl-6', title: 'Founder story', slug: 'ci-verdantgym-001', type: 'reel', concept: 'Founder journey reel', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-20', planned_time: '09:00', status: 'planned', assigned_editor_id: null, deadline: '2026-09-28', created_by: 'u-4', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-13T09:00:00Z' },
  { id: 'ci-23', agency_id: 'ag-1', client_id: 'cl-6', title: 'Transformation Tuesday post', slug: 'ci-verdantgym-002', type: 'post', concept: 'Member transformation', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-22', planned_time: '10:00', status: 'planned', assigned_editor_id: null, deadline: '2026-09-30', created_by: 'u-4', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-14T10:00:00Z' },
  { id: 'ci-24', agency_id: 'ag-1', client_id: 'cl-6', title: 'Class schedule story', slug: 'ci-verdantgym-003', type: 'story', concept: 'Weekly class schedule', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-21', planned_time: '08:00', status: 'planned', assigned_editor_id: null, deadline: '2026-09-29', created_by: 'u-4', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-12T08:00:00Z' },
  { id: 'ci-25', agency_id: 'ag-1', client_id: 'cl-1', title: 'Dental tips reel — Oct', slug: 'ci-ramanadental-006', type: 'reel', concept: 'October content', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-10-01', planned_time: '09:00', status: 'planned', assigned_editor_id: null, deadline: '2026-10-10', created_by: 'u-2', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-20T09:00:00Z' },
  { id: 'ci-26', agency_id: 'ag-1', client_id: 'cl-2', title: 'Customer review reel', slug: 'ci-grovermotors-006', type: 'reel', concept: 'Google review compilation', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-08-15', planned_time: '10:00', status: 'archived', assigned_editor_id: 'u-5', deadline: '2026-08-22', created_by: 'u-2', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-08-10T10:00:00Z' },
  { id: 'ci-27', agency_id: 'ag-1', client_id: 'cl-5', title: 'Coffee origins post', slug: 'ci-basilcafe-005', type: 'post', concept: 'Single origin story', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-18', planned_time: '11:00', status: 'calendar_approved', assigned_editor_id: null, deadline: '2026-09-25', created_by: 'u-4', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-15T11:00:00Z' },
  // Extra rows for status coverage
  { id: 'ci-28', agency_id: 'ag-1', client_id: 'cl-2', title: 'Customer testimonial video', slug: 'ci-grovermotors-007', type: 'reel', concept: 'Video compilation of reviews', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-11', planned_time: '09:00', status: 'client_approved', assigned_editor_id: 'u-6', deadline: '2026-09-16', created_by: 'u-2', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-06T09:00:00Z' },
  { id: 'ci-29', agency_id: 'ag-1', client_id: 'cl-2', title: 'Year-end sale reel', slug: 'ci-grovermotors-008', type: 'reel', concept: 'Big sale announcement', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-10-15', planned_time: '10:00', status: 'scheduled', assigned_editor_id: null, deadline: '2026-10-20', created_by: 'u-5', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-15T10:00:00Z' },
  { id: 'ci-30', agency_id: 'ag-1', client_id: 'cl-5', title: 'Cold brew launch post', slug: 'ci-basilcafe-006', type: 'post', concept: 'New cold brew range', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-12', planned_time: '09:00', status: 'posted', assigned_editor_id: 'u-6', deadline: '2026-09-18', created_by: 'u-4', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-08T09:00:00Z' },
  { id: 'ci-31', agency_id: 'ag-1', client_id: 'cl-4', title: 'Festive collection post', slug: 'ci-khannajewellers-005', type: 'post', concept: 'Festive season jewellery', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-08-20', planned_time: '10:00', status: 'archived', assigned_editor_id: 'u-5', deadline: '2026-08-27', created_by: 'u-3', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-08-12T10:00:00Z' },
  { id: 'ci-32', agency_id: 'ag-1', client_id: 'cl-1', title: 'Teeth sensitivity tips carousel', slug: 'ci-ramanadental-007', type: 'carousel', concept: 'Sensitivity FAQ', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-13', planned_time: '11:00', status: 'posted', assigned_editor_id: 'u-5', deadline: '2026-09-20', created_by: 'u-2', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-09T11:00:00Z' },
  { id: 'ci-33', agency_id: 'ag-1', client_id: 'cl-3', title: 'Home office interiors reel', slug: 'ci-sandhuinteriors-004', type: 'reel', concept: 'Work-from-home setup', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-10-01', planned_time: '09:00', status: 'scheduled', assigned_editor_id: null, deadline: '2026-10-08', created_by: 'u-5', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-18T09:00:00Z' },
  { id: 'ci-34', agency_id: 'ag-1', client_id: 'cl-4', title: 'New arrival announcement', slug: 'ci-khannajewellers-006', type: 'post', concept: 'Latest collection drop', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-20', planned_time: '11:00', status: 'calendar_approved', assigned_editor_id: null, deadline: '2026-09-27', created_by: 'u-3', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-16T11:00:00Z' },
  { id: 'ci-35', agency_id: 'ag-1', client_id: 'cl-3', title: 'Walk-in wardrobe reveal', slug: 'ci-sandhuinteriors-005', type: 'reel', concept: 'Wardrobe transformation', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-09-14', planned_time: '10:00', status: 'changes_requested', assigned_editor_id: 'u-5', deadline: '2026-09-22', created_by: 'u-3', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-09-10T10:00:00Z' },
  { id: 'ci-36', agency_id: 'ag-1', client_id: 'cl-1', title: 'Oral hygiene awareness', slug: 'ci-ramanadental-008', type: 'carousel', concept: 'Brush right campaign', script: '', instructions_editor: '', instructions_cameraman: '', reference_links: [], planned_date: '2026-08-25', planned_time: '12:00', status: 'archived', assigned_editor_id: 'u-5', deadline: '2026-09-01', created_by: 'u-2', updated_at: '2026-09-23T10:00:00Z', created_at: '2026-08-20T12:00:00Z' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getContentItemsForClient(clientId: string): ContentItem[] {
  return contentItems.filter(ci => ci.client_id === clientId)
}

export function getClientsForManager(managerId: string): Client[] {
  return clients.filter(c => c.manager_id === managerId)
}

// ── Shoot Items ──────────────────────────────────────────────────────────────

export const shootItems: ShootItem[] = [
  { shoot_id: 'sh-1', content_item_id: 'ci-1', idea_slug: 'smile-makeover-ba', drive_subfolder_id: 'dr-sh1-ci1', drive_subfolder_link: 'https://drive.google.com/drive/folders/dr-sh1-ci1' },
  { shoot_id: 'sh-1', content_item_id: 'ci-2', idea_slug: 'root-canal-myths', drive_subfolder_id: 'dr-sh1-ci2', drive_subfolder_link: 'https://drive.google.com/drive/folders/dr-sh1-ci2' },
  { shoot_id: 'sh-1', content_item_id: 'ci-3', idea_slug: 'why-ramana-dental', drive_subfolder_id: 'dr-sh1-ci3', drive_subfolder_link: 'https://drive.google.com/drive/folders/dr-sh1-ci3' },
  { shoot_id: 'sh-2', content_item_id: 'ci-4', idea_slug: 'teeth-whitening', drive_subfolder_id: 'dr-sh2-ci4', drive_subfolder_link: 'https://drive.google.com/drive/folders/dr-sh2-ci4' },
  { shoot_id: 'sh-3', content_item_id: 'ci-11', idea_slug: 'modular-kitchen', drive_subfolder_id: 'dr-sh3-ci11', drive_subfolder_link: 'https://drive.google.com/drive/folders/dr-sh3-ci11' },
  { shoot_id: 'sh-3', content_item_id: 'ci-13', idea_slug: 'before-after-lr', drive_subfolder_id: 'dr-sh3-ci13', drive_subfolder_link: 'https://drive.google.com/drive/folders/dr-sh3-ci13' },
  { shoot_id: 'sh-4', content_item_id: 'ci-12', idea_slug: 'mrs-bedi-testimonial', drive_subfolder_id: 'dr-sh4-ci12', drive_subfolder_link: 'https://drive.google.com/drive/folders/dr-sh4-ci12' },
  { shoot_id: 'sh-5', content_item_id: 'ci-18', idea_slug: 'new-season-menu', drive_subfolder_id: 'dr-sh5-ci18', drive_subfolder_link: 'https://drive.google.com/drive/folders/dr-sh5-ci18' },
  { shoot_id: 'sh-5', content_item_id: 'ci-19', idea_slug: 'baristas-pick', drive_subfolder_id: 'dr-sh5-ci19', drive_subfolder_link: 'https://drive.google.com/drive/folders/dr-sh5-ci19' },
  { shoot_id: 'sh-6', content_item_id: 'ci-1', idea_slug: 'smile-makeover-ba', drive_subfolder_id: 'dr-sh6-ci1', drive_subfolder_link: 'https://drive.google.com/drive/folders/dr-sh6-ci1' },
]

// ── Shoots ───────────────────────────────────────────────────────────────────

export const shoots: Shoot[] = [
  { id: 'sh-1', agency_id: 'ag-1', client_id: 'cl-1', title: 'Ramana Dental — Sept shoot', scheduled_start: '2026-09-22T09:00:00Z', scheduled_end: '2026-09-22T13:00:00Z', location: 'Ramana Dental Clinic, Ludhiana', cameraman_id: 'u-7', status: 'completed', drive_folder_id: 'sh1-drive-folder', drive_folder_link: 'https://drive.google.com/drive/folders/sh1-drive-folder', raw_detected_at: '2026-09-22T14:00:00Z', created_by: 'u-2', created_at: '2026-09-02T09:00:00Z' },
  { id: 'sh-2', agency_id: 'ag-1', client_id: 'cl-1', title: 'Ramana Dental — Oct prep', scheduled_start: '2026-09-20T09:00:00Z', scheduled_end: '2026-09-20T12:00:00Z', location: 'Ramana Dental Clinic, Ludhiana', cameraman_id: 'u-7', status: 'completed', drive_folder_id: null, drive_folder_link: null, raw_detected_at: null, created_by: 'u-2', created_at: '2026-09-11T09:00:00Z' },
  { id: 'sh-3', agency_id: 'ag-1', client_id: 'cl-3', title: 'Sandhu Interiors — Sept', scheduled_start: '2026-09-24T15:00:00Z', scheduled_end: '2026-09-24T18:00:00Z', location: 'Sandhu Interiors Showroom', cameraman_id: 'u-8', status: 'scheduled', drive_folder_id: null, drive_folder_link: null, raw_detected_at: null, created_by: 'u-3', created_at: '2026-09-14T09:00:00Z' },
  { id: 'sh-4', agency_id: 'ag-1', client_id: 'cl-3', title: 'Sandhu — Mrs. Bedi testimonial', scheduled_start: '2026-09-25T10:00:00Z', scheduled_end: '2026-09-25T11:30:00Z', location: 'Bedi Residence, Model Town', cameraman_id: 'u-8', status: 'scheduled', drive_folder_id: null, drive_folder_link: null, raw_detected_at: null, created_by: 'u-3', created_at: '2026-09-15T09:00:00Z' },
  { id: 'sh-5', agency_id: 'ag-1', client_id: 'cl-5', title: 'Basil Cafe — Sept menu', scheduled_start: '2026-09-26T08:00:00Z', scheduled_end: '2026-09-26T11:00:00Z', location: 'Basil Cafe, Sarabha Nagar', cameraman_id: 'u-7', status: 'scheduled', drive_folder_id: null, drive_folder_link: null, raw_detected_at: null, created_by: 'u-4', created_at: '2026-09-16T09:00:00Z' },
  { id: 'sh-6', agency_id: 'ag-1', client_id: 'cl-2', title: 'Grover Motors — Oct', scheduled_start: '2026-10-02T11:30:00Z', scheduled_end: '2026-10-02T14:00:00Z', location: 'Grover Motors Showroom', cameraman_id: 'u-8', status: 'scheduled', drive_folder_id: null, drive_folder_link: null, raw_detected_at: null, created_by: 'u-2', created_at: '2026-09-20T10:00:00Z' },
]

// ── Deliverable Versions ─────────────────────────────────────────────────────

export const deliverableVersions: DeliverableVersion[] = [
  { id: 'dv-1', agency_id: 'ag-1', content_item_id: 'ci-1', version: 1, b2_key: 'b2/cuts/ci-1/v1.mp4', file_size_bytes: 52428800, duration_seconds: 45, uploaded_by: 'u-5', uploaded_at: '2026-09-13T14:00:00Z', status: 'changes_requested', created_at: '2026-09-13T14:00:00Z' },
  { id: 'dv-2', agency_id: 'ag-1', content_item_id: 'ci-1', version: 2, b2_key: 'b2/cuts/ci-1/v2.mp4', file_size_bytes: 55050240, duration_seconds: 47, uploaded_by: 'u-5', uploaded_at: '2026-09-16T14:00:00Z', status: 'internally_approved', created_at: '2026-09-16T14:00:00Z' },
  { id: 'dv-3', agency_id: 'ag-1', content_item_id: 'ci-1', version: 3, b2_key: 'b2/cuts/ci-1/v3.mp4', file_size_bytes: 55706624, duration_seconds: 48, uploaded_by: 'u-5', uploaded_at: '2026-09-17T14:00:00Z', status: 'submitted', created_at: '2026-09-17T14:00:00Z' },
  { id: 'dv-4', agency_id: 'ag-1', content_item_id: 'ci-6', version: 1, b2_key: 'b2/cuts/ci-6/v1.mp4', file_size_bytes: 48184320, duration_seconds: 30, uploaded_by: 'u-5', uploaded_at: '2026-09-06T14:00:00Z', status: 'client_approved', created_at: '2026-09-06T14:00:00Z' },
  { id: 'dv-5', agency_id: 'ag-1', content_item_id: 'ci-11', version: 1, b2_key: 'b2/cuts/ci-11/v1.mp4', file_size_bytes: 67108864, duration_seconds: 60, uploaded_by: 'u-5', uploaded_at: '2026-09-25T14:00:00Z', status: 'submitted', created_at: '2026-09-25T14:00:00Z' },
  { id: 'dv-6', agency_id: 'ag-1', content_item_id: 'ci-14', version: 1, b2_key: 'b2/cuts/ci-14/v1.mp4', file_size_bytes: 50331648, duration_seconds: 35, uploaded_by: 'u-5', uploaded_at: '2026-09-14T10:00:00Z', status: 'changes_requested', created_at: '2026-09-14T10:00:00Z' },
  { id: 'dv-7', agency_id: 'ag-1', content_item_id: 'ci-18', version: 1, b2_key: 'b2/cuts/ci-18/v1.mp4', file_size_bytes: 47185920, duration_seconds: 25, uploaded_by: 'u-6', uploaded_at: '2026-09-23T09:00:00Z', status: 'internally_approved', created_at: '2026-09-23T09:00:00Z' },
]

// ── Comments ────────────────────────────────────────────────────────────────

export const comments: Comment[] = [
  { id: 'cm-1', agency_id: 'ag-1', version_id: 'dv-1', author_id: 'u-2', author_label: 'Jaspreet Kaur', timestamp_start: 12, timestamp_end: 18, body: 'Can we make the before shot brighter?', voice_note_key: null, transcript: null, source: 'internal', resolved_at: '2026-09-18T10:00:00Z', created_at: '2026-09-17T10:00:00Z' },
  { id: 'cm-2', agency_id: 'ag-1', version_id: 'dv-2', author_id: 'u-5', author_label: 'Rohit Bansal', timestamp_start: 30, timestamp_end: 35, body: 'Audio levels are off in the second half.', voice_note_key: null, transcript: null, source: 'internal', resolved_at: null, created_at: '2026-09-18T08:00:00Z' },
  { id: 'cm-3', agency_id: 'ag-1', version_id: 'dv-2', author_id: 'u-2', author_label: 'Jaspreet Kaur', timestamp_start: 0, timestamp_end: 5, body: 'Opening text is cut off.', voice_note_key: 'vn-001', transcript: 'Opening text is cut off, please fix.', source: 'internal', resolved_at: null, created_at: '2026-09-18T09:00:00Z' },
  { id: 'cm-4', agency_id: 'ag-1', version_id: 'dv-3', author_id: 'u-2', author_label: 'Jaspreet Kaur', timestamp_start: null, timestamp_end: null, body: 'Looks good now. Sending to client.', voice_note_key: null, transcript: null, source: 'internal', resolved_at: null, created_at: '2026-09-17T11:00:00Z' },
  { id: 'cm-5', agency_id: 'ag-1', version_id: 'dv-4', author_id: null, author_label: 'Ramana Dental', timestamp_start: 5, timestamp_end: 12, body: 'Love the before/after transition!', voice_note_key: null, transcript: null, source: 'client', resolved_at: null, created_at: '2026-09-07T08:00:00Z' },
  { id: 'cm-6', agency_id: 'ag-1', version_id: 'dv-6', author_id: null, author_label: 'Khanna Jewellers', timestamp_start: 0, timestamp_end: 8, body: 'Can you add our new tagline at the end?', voice_note_key: null, transcript: null, source: 'client', resolved_at: null, created_at: '2026-09-16T10:00:00Z' },
  { id: 'cm-7', agency_id: 'ag-1', version_id: 'dv-2', author_id: 'u-3', author_label: 'Nikhil Sharma', timestamp_start: 15, timestamp_end: 22, body: 'Brand colors feel off here.', voice_note_key: null, transcript: null, source: 'internal', resolved_at: '2026-09-19T08:00:00Z', created_at: '2026-09-18T14:00:00Z' },
]

// ── Post Schedule ────────────────────────────────────────────────────────────

export const postSchedule: PostSchedule[] = [
  { id: 'ps-1', agency_id: 'ag-1', content_item_id: 'ci-6', scheduled_at: '2026-09-02T10:00:00Z', caption: 'Walk through our new showroom!', bg_music_ref: 'trending-audio-01', posted_at: '2026-09-02T10:05:00Z', posted_by: 'u-2', created_at: '2026-09-02T10:00:00Z' },
  { id: 'ps-2', agency_id: 'ag-1', content_item_id: 'ci-8', scheduled_at: '2026-09-04T11:00:00Z', caption: 'What our customers say', bg_music_ref: 'feel-good-03', posted_at: '2026-09-04T11:02:00Z', posted_by: 'u-2', created_at: '2026-09-04T11:00:00Z' },
  { id: 'ps-3', agency_id: 'ag-1', content_item_id: 'ci-9', scheduled_at: '2026-09-08T13:00:00Z', caption: 'Diwali offers are here!', bg_music_ref: 'festive-beat-01', posted_at: '2026-09-08T13:01:00Z', posted_by: 'u-3', created_at: '2026-09-08T13:00:00Z' },
  { id: 'ps-4', agency_id: 'ag-1', content_item_id: 'ci-10', scheduled_at: '2026-09-10T15:00:00Z', caption: 'Behind the scenes at Grover Motors', bg_music_ref: null, posted_at: '2026-09-10T15:00:00Z', posted_by: 'u-3', created_at: '2026-09-10T15:00:00Z' },
  { id: 'ps-5', agency_id: 'ag-1', content_item_id: 'ci-15', scheduled_at: '2026-09-07T10:00:00Z', caption: "Today's gold rates at Khanna Jewellers", bg_music_ref: null, posted_at: '2026-09-07T10:00:00Z', posted_by: 'u-3', created_at: '2026-09-07T10:00:00Z' },
  { id: 'ps-6', agency_id: 'ag-1', content_item_id: 'ci-17', scheduled_at: '2026-09-10T12:00:00Z', caption: 'The art of custom design', bg_music_ref: 'craft-audio-02', posted_at: '2026-09-10T12:01:00Z', posted_by: 'u-3', created_at: '2026-09-10T12:00:00Z' },
  { id: 'ps-7', agency_id: 'ag-1', content_item_id: 'ci-20', scheduled_at: '2026-09-05T11:00:00Z', caption: 'Weekend brunch at Basil Cafe', bg_music_ref: 'chill-vibes-05', posted_at: '2026-09-05T11:00:00Z', posted_by: 'u-4', created_at: '2026-09-05T11:00:00Z' },
  { id: 'ps-8', agency_id: 'ag-1', content_item_id: 'ci-21', scheduled_at: '2026-09-06T12:00:00Z', caption: 'Latte art series — part 1', bg_music_ref: 'coffee-jazz-01', posted_at: '2026-09-06T12:00:00Z', posted_by: 'u-4', created_at: '2026-09-06T12:00:00Z' },
  { id: 'ps-9', agency_id: 'ag-1', content_item_id: 'ci-5', scheduled_at: '2026-09-26T16:00:00Z', caption: 'New patient special at Ramana Dental', bg_music_ref: 'reel-audio-12', posted_at: null, posted_by: null, created_at: '2026-09-22T15:30:00Z' },
  { id: 'ps-10', agency_id: 'ag-1', content_item_id: 'ci-7', scheduled_at: '2026-10-05T09:00:00Z', caption: 'Our service packages explained', bg_music_ref: 'carousel-bg-01', posted_at: null, posted_by: null, created_at: '2026-09-25T10:00:00Z' },
  { id: 'ps-11', agency_id: 'ag-1', content_item_id: 'ci-16', scheduled_at: '2026-09-28T11:00:00Z', caption: 'Bridal collection — now available', bg_music_ref: null, posted_at: null, posted_by: null, created_at: '2026-09-26T11:00:00Z' },
  { id: 'ps-12', agency_id: 'ag-1', content_item_id: 'ci-25', scheduled_at: '2026-10-08T09:00:00Z', caption: 'Dental tips for October', bg_music_ref: null, posted_at: null, posted_by: null, created_at: '2026-09-27T09:00:00Z' },
  { id: 'ps-13', agency_id: 'ag-1', content_item_id: 'ci-27', scheduled_at: '2026-09-24T11:00:00Z', caption: 'Coffee origins — where we source', bg_music_ref: null, posted_at: null, posted_by: null, created_at: '2026-09-23T10:00:00Z' },
]

// ── Monthly Plans ────────────────────────────────────────────────────────────

export const monthlyPlans: MonthlyPlan[] = [
  { id: 'mp-1', agency_id: 'ag-1', client_id: 'cl-1', month: '2026-09-01', status: 'approved', approved_at: '2026-08-28T16:00:00Z', notes: null, created_at: '2026-08-01T00:00:00Z' },
  { id: 'mp-2', agency_id: 'ag-1', client_id: 'cl-2', month: '2026-09-01', status: 'approved', approved_at: '2026-08-25T15:00:00Z', notes: null, created_at: '2026-08-01T00:00:00Z' },
  { id: 'mp-3', agency_id: 'ag-1', client_id: 'cl-3', month: '2026-09-01', status: 'approved', approved_at: '2026-08-30T16:00:00Z', notes: null, created_at: '2026-08-01T00:00:00Z' },
  { id: 'mp-4', agency_id: 'ag-1', client_id: 'cl-4', month: '2026-09-01', status: 'approved', approved_at: '2026-08-27T15:00:00Z', notes: null, created_at: '2026-08-01T00:00:00Z' },
  { id: 'mp-5', agency_id: 'ag-1', client_id: 'cl-5', month: '2026-09-01', status: 'approved', approved_at: '2026-08-29T16:00:00Z', notes: null, created_at: '2026-08-01T00:00:00Z' },
  { id: 'mp-6', agency_id: 'ag-1', client_id: 'cl-6', month: '2026-09-01', status: 'approved', approved_at: '2026-09-01T10:00:00Z', notes: 'Onboarding — reduced scope for first month', created_at: '2026-09-01T00:00:00Z' },
  { id: 'mp-7', agency_id: 'ag-1', client_id: 'cl-1', month: '2026-10-01', status: 'sent_to_client', approved_at: null, notes: null, created_at: '2026-09-20T00:00:00Z' },
  { id: 'mp-8', agency_id: 'ag-1', client_id: 'cl-2', month: '2026-10-01', status: 'sent_to_client', approved_at: null, notes: null, created_at: '2026-09-20T00:00:00Z' },
  { id: 'mp-9', agency_id: 'ag-1', client_id: 'cl-3', month: '2026-10-01', status: 'draft', approved_at: null, notes: null, created_at: '2026-09-22T00:00:00Z' },
  { id: 'mp-10', agency_id: 'ag-1', client_id: 'cl-4', month: '2026-10-01', status: 'draft', approved_at: null, notes: null, created_at: '2026-09-22T00:00:00Z' },
  { id: 'mp-11', agency_id: 'ag-1', client_id: 'cl-5', month: '2026-10-01', status: 'draft', approved_at: null, notes: null, created_at: '2026-09-22T00:00:00Z' },
]

// ── Library Assets ───────────────────────────────────────────────────────────

export const libraryAssets: LibraryAsset[] = [
  { id: 'la-1', agency_id: 'ag-1', client_id: 'cl-1', folder_name: 'brand-assets', name: 'Ramana Dental logo.png', b2_key: 'b2/lib/cl-1/logo.png', kind: 'image', file_size_bytes: 524288, uploaded_by: 'u-2', created_at: '2026-08-01T00:00:00Z' },
  { id: 'la-2', agency_id: 'ag-1', client_id: 'cl-1', folder_name: 'raw-uploads', name: 'sh1_raw_001.mp4', b2_key: 'b2/lib/cl-1/sh1_raw.mp4', kind: 'video', file_size_bytes: 1073741824, uploaded_by: 'u-7', created_at: '2026-09-22T14:00:00Z' },
  { id: 'la-3', agency_id: 'ag-1', client_id: 'cl-1', folder_name: 'reference', name: 'competitor-ad-rdental.mp4', b2_key: 'b2/lib/cl-1/ref1.mp4', kind: 'video', file_size_bytes: 52428800, uploaded_by: 'u-2', created_at: '2026-09-05T00:00:00Z' },
  { id: 'la-4', agency_id: 'ag-1', client_id: 'cl-2', folder_name: 'brand-assets', name: 'Grover Motors logo.png', b2_key: 'b2/lib/cl-2/logo.png', kind: 'image', file_size_bytes: 419430, uploaded_by: 'u-2', created_at: '2026-07-15T00:00:00Z' },
  { id: 'la-5', agency_id: 'ag-1', client_id: 'cl-2', folder_name: 'raw-uploads', name: 'showroom_aerial.mp4', b2_key: 'b2/lib/cl-2/aerial.mp4', kind: 'video', file_size_bytes: 2147483648, uploaded_by: 'u-7', created_at: '2026-09-01T00:00:00Z' },
  { id: 'la-6', agency_id: 'ag-1', client_id: 'cl-2', folder_name: 'reference', name: 'car-ad-reference.mp4', b2_key: 'b2/lib/cl-2/ref1.mp4', kind: 'video', file_size_bytes: 31457280, uploaded_by: 'u-2', created_at: '2026-08-10T00:00:00Z' },
  { id: 'la-7', agency_id: 'ag-1', client_id: 'cl-3', folder_name: 'brand-assets', name: 'Sandhu Interiors logo.png', b2_key: 'b2/lib/cl-3/logo.png', kind: 'image', file_size_bytes: 481280, uploaded_by: 'u-3', created_at: '2026-08-10T00:00:00Z' },
  { id: 'la-8', agency_id: 'ag-1', client_id: 'cl-3', folder_name: 'raw-uploads', name: 'kitchen_pan.mp4', b2_key: 'b2/lib/cl-3/pan.mp4', kind: 'video', file_size_bytes: 1610612736, uploaded_by: 'u-8', created_at: '2026-09-24T16:00:00Z' },
  { id: 'la-9', agency_id: 'ag-1', client_id: 'cl-3', folder_name: 'reference', name: 'interior-trends-2026.pdf', b2_key: 'b2/lib/cl-3/ref1.pdf', kind: 'document', file_size_bytes: 2097152, uploaded_by: 'u-3', created_at: '2026-08-20T00:00:00Z' },
  { id: 'la-10', agency_id: 'ag-1', client_id: 'cl-4', folder_name: 'brand-assets', name: 'Khanna Jewellers logo.png', b2_key: 'b2/lib/cl-4/logo.png', kind: 'image', file_size_bytes: 557056, uploaded_by: 'u-3', created_at: '2026-09-01T00:00:00Z' },
  { id: 'la-11', agency_id: 'ag-1', client_id: 'cl-4', folder_name: 'raw-uploads', name: 'jewellery_closeup.mp4', b2_key: 'b2/lib/cl-4/closeup.mp4', kind: 'video', file_size_bytes: 536870912, uploaded_by: 'u-7', created_at: '2026-09-09T00:00:00Z' },
  { id: 'la-12', agency_id: 'ag-1', client_id: 'cl-5', folder_name: 'brand-assets', name: 'Basil Cafe logo.png', b2_key: 'b2/lib/cl-5/logo.png', kind: 'image', file_size_bytes: 393216, uploaded_by: 'u-4', created_at: '2026-08-20T00:00:00Z' },
  { id: 'la-13', agency_id: 'ag-1', client_id: 'cl-5', folder_name: 'raw-uploads', name: 'barista_pour.mp4', b2_key: 'b2/lib/cl-5/pour.mp4', kind: 'video', file_size_bytes: 268435456, uploaded_by: 'u-7', created_at: '2026-09-26T08:30:00Z' },
  { id: 'la-14', agency_id: 'ag-1', client_id: 'cl-6', folder_name: 'brand-assets', name: 'Verdant Gym logo.png', b2_key: 'b2/lib/cl-6/logo.png', kind: 'image', file_size_bytes: 368640, uploaded_by: 'u-4', created_at: '2026-09-15T00:00:00Z' },
]

// ── Raw Files ────────────────────────────────────────────────────────────────

export const rawFiles: RawFile[] = [
  { id: 'rf-1', agency_id: 'ag-1', shoot_id: 'sh-1', filename: 'raw_sh1_001.mp4', b2_key: 'b2/raw/sh1/raw_sh1_001.mp4', file_size_bytes: 5368709120, mime_type: 'video/mp4', uploaded_at: '2026-09-22T14:30:00Z', uploaded_by: 'u-7' },
  { id: 'rf-2', agency_id: 'ag-1', shoot_id: 'sh-1', filename: 'raw_sh1_002a.mp4', b2_key: 'b2/raw/sh1/raw_sh1_002a.mp4', file_size_bytes: 2147483648, mime_type: 'video/mp4', uploaded_at: '2026-09-22T14:35:00Z', uploaded_by: 'u-7' },
  { id: 'rf-3', agency_id: 'ag-1', shoot_id: 'sh-1', filename: 'raw_sh1_002b.mp4', b2_key: 'b2/raw/sh1/raw_sh1_002b.mp4', file_size_bytes: 1073741824, mime_type: 'video/mp4', uploaded_at: '2026-09-22T14:40:00Z', uploaded_by: 'u-7' },
]

// ── Upload Sessions ──────────────────────────────────────────────────────────

export const uploadSessions: UploadSession[] = [
  { id: 'us-1', agency_id: 'ag-1', shoot_id: 'sh-1', status: 'active', file_count: 1, total_bytes: 3221225472, created_by: 'u-7', completed_at: null, created_at: '2026-09-22T14:00:00Z' },
  { id: 'us-2', agency_id: 'ag-1', shoot_id: 'sh-1', status: 'active', file_count: 1, total_bytes: 5368709120, created_by: 'u-7', completed_at: null, created_at: '2026-09-22T10:00:00Z' },
  { id: 'us-3', agency_id: 'ag-1', shoot_id: 'sh-2', status: 'expired', file_count: 1, total_bytes: 2684354560, created_by: 'u-7', completed_at: null, created_at: '2026-09-12T12:00:00Z' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getContentItemsForEditor(editorId: string): ContentItem[] {
  return contentItems.filter(ci => ci.assigned_editor_id === editorId)
}

export function getShootsForCameraman(cameramanId: string): Shoot[] {
  return shoots.filter(s => s.cameraman_id === cameramanId)
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}


