import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** Longest side of stored photos. Small enough that ~100 photos fit comfortably in local JSON storage. */
const MAX_SIDE = 320;

/**
 * Let the user pick (or take) a photo, square-crop it, shrink it and return a JPEG data URI.
 * Returns null if the user cancels; throws with a readable message if permission is denied.
 */
export async function pickExercisePhoto(source: 'library' | 'camera'): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 };
  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Camera permission is needed to take a photo. You can allow it in Settings.');
    result = await ImagePicker.launchCameraAsync(options);
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error('Photo library permission is needed to choose a photo. You can allow it in Settings.');
    result = await ImagePicker.launchImageLibraryAsync(options);
  }
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  // Pass both sides explicitly: the web implementation can't infer a missing one.
  const w = asset.width || MAX_SIDE;
  const h = asset.height || MAX_SIDE;
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const ref = await ImageManipulator.manipulate(asset.uri)
    .resize({ width: Math.round(w * scale), height: Math.round(h * scale) })
    .renderAsync();
  const saved = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
  if (!saved.base64) throw new Error('Could not process the photo.');
  return `data:image/jpeg;base64,${saved.base64}`;
}
