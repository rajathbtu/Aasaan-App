import React from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Spinner from './Spinner';
import { colors } from '../theme';

type BlockingLoaderProps = {
  visible: boolean;
};

const BlockingLoader: React.FC<BlockingLoaderProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={styles.overlay} pointerEvents="auto">
        <View style={styles.loader}>
          <Spinner size="small" color={colors.primary} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  loader: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
});

export default BlockingLoader;