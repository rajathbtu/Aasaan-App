import React, { useEffect, useRef } from 'react';
import { useGlobalLoader } from '../contexts/GlobalLoaderContext';

type BlockingLoaderProps = {
  visible: boolean;
  /** Optional contextual message shown under the animated service icons. */
  message?: string;
};

/**
 * Declarative wrapper around the global service-icon loader.
 *
 * The overlay itself is rendered exactly once by `GlobalLoaderProvider` at
 * the app root, so this component renders nothing — it only forwards
 * visibility changes to the shared reference counter. Existing usages
 * (`<BlockingLoader visible={...} />`) keep working unchanged while gaining
 * the centred, animated, app-wide overlay.
 */
const BlockingLoader: React.FC<BlockingLoaderProps> = ({ visible, message }) => {
  const { showLoader, hideLoader } = useGlobalLoader();
  const messageRef = useRef(message);
  messageRef.current = message;

  useEffect(() => {
    if (!visible) return undefined;
    showLoader(messageRef.current);
    return () => {
      hideLoader();
    };
  }, [visible, showLoader, hideLoader]);

  return null;
};

export default BlockingLoader;
