-- Events for the dedicated /demo page: page views, the "Add the demo card" button, the demo link
-- being opened (QR scans and button taps), and demo card joins from /demo.
alter table public.site_events drop constraint site_events_event_check;
alter table public.site_events add constraint site_events_event_check check (event in (
  'try_it_click', 'book_call_click', 'demo_join_site',
  'demo_view', 'demo_button_click', 'demo_link_open', 'demo_join'
));
