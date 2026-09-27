// ==================== FIREBASE CONFIG ====================
// Pegue esses valores em: Console do Firebase > Configurações do projeto
// > Seus apps > SDK setup and configuration (ícone "</>").
// Esses valores NÃO são segredos — são feitos para ficar públicos no client.
// Quem protege os dados são as regras do Firestore (firestore.rules).
const firebaseConfig = {
    apiKey: "AIzaSyBRaFTwZyoCS85LHn4n6BWRiDRp14HtBNw",
    authDomain: "fgcgub.firebaseapp.com",
    projectId: "fgcgub",
    storageBucket: "fgcgub.firebasestorage.app",
    messagingSenderId: "901084040147",
    appId: "1:901084040147:web:240dbad418c09482defd26",
    measurementId: "G-GK3DG0KC7V"
};

firebase.initializeApp(firebaseConfig);
