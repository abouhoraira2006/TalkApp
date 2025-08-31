# تحليل وإصلاح خطأ React Hooks في شاشة المحادثة

## 1. المشكلة

الخطأ الذي نواجهه هو:
```
ERROR  Warning: Error: Rendered more hooks than during the previous render.
```
هذا الخطأ يحدث في ملف `src/screens/ChatScreen.tsx` ويشير إلى أن عدد الـ "Hooks" (مثل `useState`, `useEffect`, `useCallback`) التي يتم استدعاؤها قد تغير بين عمليات إعادة رسم (render) المكون.

## 2. وصف المشكلة والسبب الجذري

تعتمد React Hooks على مبدأ أساسي: **يجب استدعاء الـ Hooks دائمًا بنفس الترتيب وفي المستوى الأعلى (Top Level) من المكون.**

السبب الجذري للمشكلة في `ChatScreen.tsx` هو وجود **عودة مبكرة (Early Return)** في الكود قبل استدعاء جميع الـ Hooks.

**الكود الذي يسبب المشكلة:**

```tsx
const ChatScreen = ({ route, navigation }: ChatScreenProps) => {
  // --- Hook رقم 1 ---
  const { user, loading } = useEmailAuth();
  const { chatId: initialChatId, otherUser } = route.params;
  
  // -- شرط العودة المبكرة --
  if (loading) {
    return (
      <View>...</View>
    );
  }
  
  // -- شرط آخر للعودة المبكرة --
  if (!user) {
    return (
      <View>...</View>
    );
  }
  
  // --- باقي الـ Hooks ---
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  // ... والعديد من الـ Hooks الأخرى

  useEffect(() => {
    // ...
  }, []);

  // ...
};
```

**سيناريو حدوث الخطأ:**
1.  **عند الرسم الأول (Initial Render):** يكون المتغير `loading` قيمته `true`. يتم استدعاء `useEmailAuth()` فقط (Hook واحد)، ثم يدخل الكود في جملة `if (loading)` ويقوم بإرجاع `View` التحميل ويتوقف. **إجمالي الـ Hooks المستدعاة: 1**.
2.  **عند الرسم الثاني (Second Render):** تتغير قيمة `loading` إلى `false`. يتجاوز الكود جملة `if (loading)`. إذا كان المستخدم مسجلاً دخوله، فإنه يتجاوز `if (!user)` أيضًا. ثم يبدأ في استدعاء جميع الـ Hooks الأخرى: `useState`, `useEffect`, `useCallback`، إلخ. **إجمالي الـ Hooks المستدعاة: أكثر من 20**.

هذا التغيير في عدد الـ Hooks المستدعاة بين عملية الرسم الأولى والثانية يكسر قواعد React ويؤدي إلى حدوث الخطأ.

## 3. الحل المقترح

لإصلاح هذه المشكلة، يجب نقل جميع استدعاءات الـ Hooks إلى **بداية المكون**، قبل أي شروط أو عمليات عودة مبكرة.

**خطوات الإصلاح:**
1.  اجمع كل استدعاءات الـ Hooks (مثل `useState`, `useEffect`, `useMemo`, `useCallback`, `useSharedValue`) وضعها في أعلى المكون.
2.  بعد استدعاء جميع الـ Hooks، يمكنك استخدام الشروط (`if (loading)` أو `if (!user)`) لعرض واجهة مستخدم مختلفة (مثل شاشة تحميل أو رسالة خطأ).

**مثال على الكود بعد الإصلاح:**

```tsx
const ChatScreen = ({ route, navigation }: ChatScreenProps) => {
  // --- الخطوة 1: استدعاء جميع الـ Hooks في البداية وبنفس الترتيب دائمًا ---
  const { user, loading } = useEmailAuth();
  const { chatId: initialChatId, otherUser } = route.params;
  
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  // ... استدعاء كل الـ Hooks الأخرى هنا

  const computedChatId = initialChatId || (user ? [user.id, otherUser.id].sort().join('_') : null);

  useEffect(() => {
    if (!computedChatId || !user?.id) return; // الشروط تكون داخل الـ Hook وليس قبله
    // ...
  }, [computedChatId, user?.id]);

  // ... باقي الـ Hooks

  // --- الخطوة 2: التعامل مع حالات التحميل والخطأ بعد استدعاء الـ Hooks ---
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <Text style={{ color: '#ffffff', fontSize: 16 }}>جاري التحميل...</Text>
      </View>
    );
  }
  
  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <Text style={{ color: '#ef4444', fontSize: 16, textAlign: 'center' }}>
          يجب تسجيل الدخول أولاً
        </Text>
      </View>
    );
  }

  // --- الخطوة 3: عرض الواجهة الرئيسية للمكون ---
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* ... JSX الخاص بواجهة المحادثة ... */}
    </GestureHandlerRootView>
  );
};

export default ChatScreen;
```

بهذه الطريقة، نضمن أن عدد وترتيب الـ Hooks يظل ثابتًا في كل مرة يتم فيها رسم المكون، مما يحل المشكلة ويتوافق مع قواعد React.
