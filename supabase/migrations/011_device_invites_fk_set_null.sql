-- ============================================================
-- 011_device_invites_fk_set_null.sql
-- Permite eliminar un dispositivo aunque tenga invitaciones
-- asociadas. La FK device_invites.device_id pasa a SET NULL
-- para preservar el historial de invites sin bloquear el delete.
-- ============================================================

alter table public.device_invites
  drop constraint device_invites_device_id_fkey,
  add constraint device_invites_device_id_fkey
    foreign key (device_id)
    references public.devices(id)
    on delete set null;
