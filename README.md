# Installation
```bash
npx expo install react-native-gesture-handler
```

# Getting Started
Wrap your app with ```GestureHandlerRootView``` component.
```js
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView>
      <ActualApp />
    </GestureHandlerRootView>
  );
}
```

If you don't provide anything to the styles prop, it will default to ```flex: 1```. If you want to customize the styling of the root view, don't forget to also include ```flex: 1``` in the custom style, otherwise your app won't render anything. Keep GestureHandlerRootView as close to the actual root of the app as possible. It's the entry point for all gestures and all gesture relations. The gestures won't be recognized outside of the root view, and relations only work between gestures mounted under the same root view.

If you're unsure if one of your dependencies already renders ```GestureHandlerRootView``` on its own, don't worry and add one at the root anyway. In case of nested root views, Gesture Handler will only use the top-most one and ignore the nested ones.

**tip**
If you're using gesture handler in your component library, you may want to wrap your library's code in the GestureHandlerRootView component. This will avoid extra configuration for the user.

# Gesture composition & interactions
Composing gestures is much simpler in ```RNGH2```, you don't need to create a ref for every gesture that depends on another one. Instead you can use ```Race```, ```Simultaneous``` and ```Exclusive``` methods provided by the Gesture object.

## Race
Only one of the provided gestures can become active at the same time. The first gesture to become active will cancel the rest of the gestures. It accepts variable number of arguments. It is the equivalent to having more than one gesture handler without defining ```simultaneousHandlers``` and ```waitFor``` props.

For example, lets say that you have a component that you want to make draggable but you also want to show additional options on long press. Presumably you would not want the component to move after the long press activates. You can accomplish this using ```Race```:

Note: the ```useSharedValue``` and ```useAnimatedStyle``` are part of ```react-native-reanimated```.

```js
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

function App() {
  const offset = useSharedValue({ x: 0, y: 0 });
  const start = useSharedValue({ x: 0, y: 0 });
  const popupPosition = useSharedValue({ x: 0, y: 0 });
  const popupAlpha = useSharedValue(0);

  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: offset.value.x },
        { translateY: offset.value.y },
      ],
    };
  });

  const animatedPopupStyles = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: popupPosition.value.x },
        { translateY: popupPosition.value.y },
      ],
      opacity: popupAlpha.value,
    };
  });

  const dragGesture = Gesture.Pan()
    .onStart((_e) => {
      popupAlpha.value = withTiming(0);
    })
    .onUpdate((e) => {
      offset.value = {
        x: e.translationX + start.value.x,
        y: e.translationY + start.value.y,
      };
    })
    .onEnd(() => {
      start.value = {
        x: offset.value.x,
        y: offset.value.y,
      };
    });

  const longPressGesture = Gesture.LongPress().onStart((_event) => {
    popupPosition.value = { x: offset.value.x, y: offset.value.y };
    popupAlpha.value = withTiming(1);
  });

  const composed = Gesture.Race(dragGesture, longPressGesture);

  return (
    <Animated.View>
      <Popup style={animatedPopupStyles} />
      <GestureDetector gesture={composed}>
        <Component style={animatedStyles} />
      </GestureDetector>
    </Animated.View>
  );
}
```

## Simultaneous
All of the provided gestures can activate at the same time. Activation of one will not cancel the other. It is the equivalent to having some gesture handlers, each with ```simultaneousHandlers``` prop set to the other handlers.

For example, if you want to make a gallery app, you might want user to be able to zoom, rotate and pan around photos. You can do it with Simultaneous:

Note: the ```useSharedValue``` and ```useAnimatedStyle``` are part of ```react-native-reanimated```.

```js
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

function App() {
  const offset = useSharedValue({ x: 0, y: 0 });
  const start = useSharedValue({ x: 0, y: 0 });
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const savedRotation = useSharedValue(0);
  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: offset.value.x },
        { translateY: offset.value.y },
        { scale: scale.value },
        { rotateZ: `${rotation.value}rad` },
      ],
    };
  });

  const dragGesture = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      offset.value = {
        x: e.translationX + start.value.x,
        y: e.translationY + start.value.y,
      };
    })
    .onEnd(() => {
      start.value = {
        x: offset.value.x,
        y: offset.value.y,
      };
    });

  const zoomGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const rotateGesture = Gesture.Rotation()
    .onUpdate((event) => {
      rotation.value = savedRotation.value + event.rotation;
    })
    .onEnd(() => {
      savedRotation.value = rotation.value;
    });

  const composed = Gesture.Simultaneous(
    dragGesture,
    Gesture.Simultaneous(zoomGesture, rotateGesture)
  );

  return (
    <Animated.View>
      <GestureDetector gesture={composed}>
        <Photo style={animatedStyles} />
      </GestureDetector>
    </Animated.View>
  );
}
```

## Exclusive
Only one of the provided gestures can become active, with the first one having a higher priority than the second one (if both gestures are still possible, the second one will wait for the first one to fail before it activates), second one having a higher priority than the third one, and so on. It is equivalent to having some gesture handlers where the second one has the ```waitFor``` prop set to the first handler, third one has the ```waitFor``` prop set to the first and the second one, and so on.

For example, if you want to make a component that responds to single tap as well as to a double tap, you can accomplish that using ```Exclusive```:

```js
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

function App() {
  const singleTap = Gesture.Tap().onEnd((_event, success) => {
    if (success) {
      console.log('single tap!');
    }
  });
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((_event, success) => {
      if (success) {
        console.log('double tap!');
      }
    });

  const taps = Gesture.Exclusive(doubleTap, singleTap);

  return (
    <GestureDetector gesture={taps}>
      <Component />
    </GestureDetector>
  );
}
```

# Cross-component interactions
You may have noticed that gesture composition described above requires you to mount all of the composed gestures under a single GestureDetector, effectively attaching them to the same underlying component. You can customize how gestures interact with each other across multiple components in a couple of ways:

## requireExternalGestureToFail
```requireExternalGestureToFail``` allows to delay activation of the handler until all handlers passed as arguments to this method fail (or don't begin at all).

For example, you may want to have two nested components, both of them can be tapped by the user to trigger different actions: outer view requires one tap, but the inner one requires 2 taps. If you don't want the first tap on the inner view to activate the outer handler, you must make the outer gesture wait until the inner one fails:

```js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

export default function Example() {
  const innerTap = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      console.log('inner tap');
    });

  const outerTap = Gesture.Tap()
    .onStart(() => {
      console.log('outer tap');
    })
    .requireExternalGestureToFail(innerTap);

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={outerTap}>
        <View style={styles.outer}>
          <GestureDetector gesture={innerTap}>
            <View style={styles.inner} />
          </GestureDetector>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outer: {
    width: 250,
    height: 250,
    backgroundColor: 'lightblue',
  },
  inner: {
    width: 100,
    height: 100,
    backgroundColor: 'blue',
    alignSelf: 'center',
  },
});
```

## blocksExternalGesture
```blocksExternalGesture``` works similarly to ```requireExternalGestureToFail``` but the direction of the relation is reversed - instead of being one-to-many relation, it's many-to-one. It's especially useful for making lists where the ```ScrollView``` component needs to wait for every gesture underneath it. All that's required to do is to pass a ref, for example:

```js
import React, { useRef } from 'react';
import { StyleSheet } from 'react-native';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
  ScrollView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

const ITEMS = ['red', 'green', 'blue', 'yellow'];

function Item({ backgroundColor, scrollRef }) {
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(1);

  const pinch = Gesture.Pinch()
    .blocksExternalGesture(scrollRef)
    .onBegin(() => {
      zIndex.value = 100;
    })
    .onChange((e) => {
      scale.value *= e.scaleChange;
    })
    .onFinalize(() => {
      scale.value = withTiming(1, undefined, (finished) => {
        if (finished) {
          zIndex.value = 1;
        }
      });
    });

  const animatedStyles = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    zIndex: zIndex.value,
  }));

  return (
    <GestureDetector gesture={pinch}>
      <Animated.View
        style={[
          { backgroundColor: backgroundColor },
          styles.item,
          animatedStyles,
        ]}
      />
    </GestureDetector>
  );
}

export default function Example() {
  const scrollRef = useRef();

  return (
    <GestureHandlerRootView style={styles.container}>
      <ScrollView style={styles.container} ref={scrollRef}>
        {ITEMS.map((item) => (
          <Item backgroundColor={item} key={item} scrollRef={scrollRef} />
        ))}
      </ScrollView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  item: {
    flex: 1,
    aspectRatio: 1,
  },
});
```

## simultaneousWithExternalGesture
```simultaneousWithExternalGesture``` allows gestures across different components to be recognized simultaneously. For example, you may want to have two nested views, both with tap gesture attached. Both of them require one tap, but tapping the inner one should also activate the gesture attached to the outer view:

```js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

export default function Example() {
  const innerTap = Gesture.Tap()
    .onStart(() => {
      console.log('inner tap');
    });

  const outerTap = Gesture.Tap()
    .onStart(() => {
      console.log('outer tap');
    })
    .simultaneousWithExternalGesture(innerTap);

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={outerTap}>
        <View style={styles.outer}>
          <GestureDetector gesture={innerTap}>
            <View style={styles.inner} />
          </GestureDetector>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outer: {
    width: 250,
    height: 250,
    backgroundColor: 'lightblue',
  },
  inner: {
    width: 100,
    height: 100,
    backgroundColor: 'blue',
    alignSelf: 'center',
  },
});
```

# Gesture states & events
Every gesture can be treated as ["state machine"](https://en.wikipedia.org/wiki/Finite-state_machine). At any given time, each handler instance has an assigned state that can change when new touch events occur or can be forced to change by the touch system in certain circumstances.

A gesture can be in one of the six possible states:

- **UNDETERMINED**: This is the initial state of each gesture recognizer and it goes into this state after it's done recognizing a gesture.
- **FAILED**: A gesture recognizer received some touches but for some reason didn't recognize them. For example, if a finger travels more distance than a defined ```maxDist``` property allows, then the gesture won't become active but will fail instead. Afterwards, it's state will be reset to ```UNDETERMINED```.
- **BEGAN**: Gesture recognizer has started receiving touch stream but hasn't yet received enough data to either fail or activate.
- **CANCELLED**: The gesture recognizer has received a signal (possibly new touches or a command from the touch system controller) resulting in the cancellation of a continuous gesture. The gesture's state will become ```CANCELLED``` until it is finally reset to the initial state, ```UNDETERMINED```.
- **ACTIVE**: Recognizer has recognized a gesture. It will become and stay in the ```ACTIVE``` state until the gesture finishes (e.g. when user lifts the finger) or gets cancelled by the touch system. Under normal circumstances the state will then turn into ```END```. In the case that a gesture is cancelled by the touch system, its state would then become ```CANCELLED```.
- **END**: The gesture recognizer has received touches signalling the end of a gesture. Its state will become ```END``` until it is reset to ```UNDETERMINED```.

## State flows
The most typical flow of state is when a gesture picks up on an initial touch event, then recognizes it, then acknowledges its ending and resets itself back to the initial state.


## Events
There are three types of events in ```RNGH2```: ```StateChangeEvent```, ```GestureEvent``` and ```PointerEvent```. 
The ```StateChangeEvent``` is send every time a gesture moves to a different state, while ```GestureEvent``` is send every time a gesture is updated. The first two carry a gesture-specific data and a state property, indicating the current state of the gesture. ```StateChangeEvent``` also carries a oldState property indicating the previous state of the gesture. ```PointerEvent``` carries information about raw touch events, like touching the screen or moving the finger. These events are handled internally before they are passed along to the correct callbacks:

- **onBegin**: Is called when a gesture transitions to the ```BEGAN``` state.
- **onStart**: Is called when a gesture transitions to the ```ACTIVE``` state.
- **onEnd**: Is called when a gesture transitions from the ```ACTIVE``` state to the ```END```, ```FAILED```, or ```CANCELLED``` state. If the gesture transitions to the ```END``` state, the success argument is set to true otherwise it is set to false.
- **onFinalize**: Is called when a gesture transitions to the ```END```, ```FAILED```, or ```CANCELLED``` state. If the gesture transitions to the ```END``` state, the success argument is set to true otherwise it is set to false. If the gesture transitions from the ```ACTIVE``` state, it will be called after ```onEnd```.
- **onUpdate**: Is called every time a gesture is updated while it is in the ```ACTIVE``` state.
- **onPointerDown**: Is called when new pointers are placed on the screen. It may carry information about more than one pointer because the events are batched.
- **onPointerMove**: Is called when pointers are moved on the screen. It may carry information about more than one pointer because the events are batched.
- **onPointerUp**: Is called when pointers are lifted from the screen. It may carry information about more than one pointer because the events are batched.
- **onPointerCancelled**:Is called when there will be no more information about this pointer. It may be called because the gesture has ended or was interrupted. It may carry information about more than one pointer because the events are batched.

# Quick Start
**RNGH2** provides much simpler way to add gestures to your app. All you need to do is wrap the view that you want your gesture to work on with **GestureDetector**, define the gesture and pass it to detector. That's all!

To demonstrate how you would use the new API, let's make a simple app where you can drag a ball around. You will need to add ```react-native-gesture-handle```r (for gestures) and ```react-native-reanimated``` (for animations) modules.

```js
import React from "react";
import { SafeAreaView, StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const styles = StyleSheet.create({
  ball: {
    width: 100,
    height: 100,
    borderRadius: 100,
    backgroundColor: "blue",
    alignSelf: "center",
  },
});

const Ball = () => {
  const isPressed = useSharedValue(false);
  const offset = useSharedValue({ x: 0, y: 0 });

  const animatedStyles = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: offset.value.x },
        { translateY: offset.value.y },
        { scale: withSpring(isPressed.value ? 1.2 : 1) },
      ],
      backgroundColor: isPressed.value ? "yellow" : "blue",
    };
  });

  const start = useSharedValue({ x: 0, y: 0 });
  const gesture = Gesture.Pan()
    .onBegin(() => {
      isPressed.value = true;
    })
    .onUpdate((e) => {
      offset.value = {
        x: e.translationX + start.value.x,
        y: e.translationY + start.value.y,
      };
    })
    .onEnd(() => {
      start.value = {
        x: offset.value.x,
        y: offset.value.y,
      };
    })
    .onFinalize(() => {
      isPressed.value = false;
    });

  return (
    <GestureDetector gesture={gesture}>
      <SafeAreaView>
        <Animated.View style={[styles.ball, animatedStyles]} />
      </SafeAreaView>
    </GestureDetector>
  );
};

export default Ball;
```

We need to define shared values to keep track of the ball position and create animated styles in order to be able to position the ball on the screen and add it to the ball's styles. Then define the ```pan gesture``` and assign it to the ```detector```.

Note the ***start*** shared value. We need it to store the position of the ball at the moment we grab it to be able to correctly position it later, because we only have access to translation relative to the starting point of the gesture.