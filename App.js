import { SafeAreaView } from "react-native";
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { Component } from "./Component";

function App() {
  const singleTap = Gesture.Tap().onEnd((_event, success) => {
    if (success) {
      console.log("single tap!");
    }
  });
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((_event, success) => {
      if (success) {
        console.log("double tap!");
      }
    });

  const taps = Gesture.Exclusive(doubleTap, singleTap);

  return (
    <GestureHandlerRootView>
      <SafeAreaView>
        <GestureDetector gesture={taps}>
          <Component />
        </GestureDetector>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
export default App;
