ALTER TABLE preview_native_notification
  DROP CONSTRAINT IF EXISTS preview_native_notification_state_check;

ALTER TABLE preview_native_notification
  ADD CONSTRAINT preview_native_notification_state_check
  CHECK (state IN ('PENDING','RETRYABLE_FAILURE','COMPLETE','TERMINAL_UNAVAILABLE'));

UPDATE preview_native_notification notification
SET state='TERMINAL_UNAVAILABLE',
    last_response=coalesce(notification.last_response, '{}'::jsonb) || jsonb_build_object(
      'terminal', true,
      'reason', 'provider-object-permanently-unavailable'
    ),
    updated_at=now()
FROM preview_release_action action
WHERE notification.build_id=action.remote_id
  AND action.kind IN ('IOS_BUILD','ANDROID_BUILD')
  AND action.state='REMOTE_OBJECT_UNAVAILABLE'
  AND notification.state IN ('PENDING','RETRYABLE_FAILURE');
