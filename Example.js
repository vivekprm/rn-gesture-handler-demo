import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue } from "react-native-reanimated";
import PointerElement from "./PointerElement";

export default function Example() {
  const trackedPointers = [];
  const active = useSharedValue(false);
  const initialPointer = {
    visible: false,
    x: 0,
    y: 0,
  };

  for (let i = 0; i < 12; i++) {
    trackedPointers[i] = useSharedValue(initialPointer);
  }

  const gesture = Gesture.Manual();

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={{ flex: 1 }}>
        {trackedPointers.map((pointer, index) => (
          <PointerElement pointer={pointer} active={active} key={index} />
        ))}
      </Animated.View>
    </GestureDetector>
  );
}
