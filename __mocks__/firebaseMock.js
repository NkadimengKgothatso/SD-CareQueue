const fn = () => {};

export const initializeApp = fn;
export const getAuth = fn;
export const onAuthStateChanged = fn;
export const getFirestore = fn;

export const collection = fn;
export const query = fn;
export const where = fn;
export const onSnapshot = fn;

export const doc = fn;
export const getDoc = fn;

export const getDocs = async () => ({
  empty: true,
  docs: [],
  forEach: () => {}
});

export const updateDoc = fn;
export const deleteDoc = fn;
export const addDoc = fn;

export const serverTimestamp = () => new Date();