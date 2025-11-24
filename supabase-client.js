// Supabase Client Configuration and Integration
// ==============================================

const SUPABASE_URL = 'https://qcnepxcqilqrhayzhlfa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjbmVweGNxaWxxcmhheXpobGZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTgwMjYsImV4cCI6MjA3ODAzNDAyNn0.Gz7wvMgtu-UtCqw-5MF9s-T-pk-eo2TSw7zOtedWozk';

// Supabase client instance
let supabaseClient = null;
let currentUser = null;

// ==============================================
// INITIALIZATION
// ==============================================

function initSupabase() {
  if (!window.supabase) {
    console.error('Supabase library not loaded. Include CDN script in HTML.');
    return false;
  }
  
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Supabase client initialized');
  
  // Check for existing session
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      currentUser = session.user;
      console.log('User already logged in:', currentUser.email);
      onAuthStateChange(true);
    } else {
      onAuthStateChange(false);
    }
  });
  
  // Listen for auth changes
  supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);
    currentUser = session?.user || null;
    onAuthStateChange(!!session);
  });
  
  return true;
}

// ==============================================
// AUTHENTICATION
// ==============================================

async function signUp(email, password) {
  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    
    console.log('Sign up successful:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Sign up error:', error);
    return { success: false, error: error.message };
  }
}

async function signIn(email, password) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    currentUser = data.user;
    console.log('Sign in successful:', currentUser.email);
    return { success: true, user: currentUser };
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error: error.message };
  }
}

async function signOut() {
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    
    currentUser = null;
    console.log('Sign out successful');
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: error.message };
  }
}

function getCurrentUser() {
  return currentUser;
}

function isAuthenticated() {
  return !!currentUser;
}

// ==============================================
// STORAGE (Images/Media)
// ==============================================

async function uploadImage(file, folder = '') {
  if (!isAuthenticated()) {
    return { success: false, error: 'Not authenticated' };
  }
  
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { data, error } = await supabaseClient.storage
      .from('schedule-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) throw error;
    
    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('schedule-images')
      .getPublicUrl(data.path);
    
    console.log('Image uploaded:', publicUrl);
    return { success: true, url: publicUrl, path: data.path };
  } catch (error) {
    console.error('Upload error:', error);
    return { success: false, error: error.message };
  }
}

async function deleteImage(path) {
  if (!isAuthenticated()) {
    return { success: false, error: 'Not authenticated' };
  }
  
  try {
    const { error } = await supabaseClient.storage
      .from('schedule-images')
      .remove([path]);
    
    if (error) throw error;
    
    console.log('Image deleted:', path);
    return { success: true };
  } catch (error) {
    console.error('Delete error:', error);
    return { success: false, error: error.message };
  }
}

// ==============================================
// SCHEDULE FILES (JSON Storage)
// ==============================================

async function saveScheduleFile(fileName, scheduleData) {
  if (!isAuthenticated()) {
    return { success: false, error: 'Not authenticated' };
  }
  
  try {
    // Ensure .json extension
    if (!fileName.endsWith('.json')) {
      fileName += '.json';
    }
    
    // Create file path with user ID folder
    const filePath = `${currentUser.id}/${fileName}`;
    
    // Convert to JSON string
    const jsonString = JSON.stringify(scheduleData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Try to delete existing file first (no UPDATE permission needed)
    try {
      await supabaseClient.storage
        .from('schedule-files')
        .remove([filePath]);
    } catch (e) {
      // File might not exist, that's ok
    }
    
    // Now upload as new file
    const { data, error } = await supabaseClient.storage
      .from('schedule-files')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: false // Don't try to update, just insert
      });
    
    if (error) throw error;
    
    console.log('Schedule file saved:', filePath);
    return { success: true, path: data.path };
  } catch (error) {
    console.error('Save schedule file error:', error);
    return { success: false, error: error.message };
  }
}

async function loadScheduleFile(fileName) {
  if (!isAuthenticated()) {
    return { success: false, error: 'Not authenticated' };
  }
  
  try {
    const filePath = `${currentUser.id}/${fileName}`;
    
    const { data, error } = await supabaseClient.storage
      .from('schedule-files')
      .download(filePath);
    
    if (error) throw error;
    
    // Read blob as text
    const text = await data.text();
    const scheduleData = JSON.parse(text);
    
    console.log('Schedule file loaded:', filePath);
    return { success: true, data: scheduleData, fileName };
  } catch (error) {
    console.error('Load schedule file error:', error);
    return { success: false, error: error.message };
  }
}

async function listScheduleFiles() {
  if (!isAuthenticated()) {
    return { success: false, error: 'Not authenticated' };
  }
  
  try {
    const { data, error } = await supabaseClient.storage
      .from('schedule-files')
      .list(currentUser.id, {
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (error) throw error;
    
    // Filter to only .json files
    const jsonFiles = data.filter(file => file.name.endsWith('.json'));
    
    console.log('Schedule files listed:', jsonFiles.length);
    return { success: true, data: jsonFiles };
  } catch (error) {
    console.error('List schedule files error:', error);
    return { success: false, error: error.message };
  }
}

async function deleteScheduleFile(fileName) {
  if (!isAuthenticated()) {
    return { success: false, error: 'Not authenticated' };
  }
  
  try {
    const filePath = `${currentUser.id}/${fileName}`;
    
    const { error } = await supabaseClient.storage
      .from('schedule-files')
      .remove([filePath]);
    
    if (error) throw error;
    
    console.log('Schedule file deleted:', filePath);
    return { success: true };
  } catch (error) {
    console.error('Delete schedule file error:', error);
    return { success: false, error: error.message };
  }
}

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

function onAuthStateChange(authenticated) {
  // Check if user chose local-only mode
  const useLocalMode = localStorage.getItem('useLocalMode') === 'true';
  
  // Update UI based on auth state or local mode
  const authUI = document.getElementById('authUI');
  const mainApp = document.getElementById('mainApp');
  
  if (authUI && mainApp) {
    if (authenticated || useLocalMode) {
      authUI.style.display = 'none';
      mainApp.style.display = 'block';
    } else {
      authUI.style.display = 'flex';
      mainApp.style.display = 'none';
    }
  }
  
  // Trigger custom event for app to handle
  window.dispatchEvent(new CustomEvent('authStateChanged', {
    detail: { authenticated, user: currentUser, localMode: useLocalMode }
  }));
}

// ==============================================
// EXPORTS
// ==============================================

window.SupabaseAPI = {
  init: initSupabase,
  auth: {
    signUp,
    signIn,
    signOut,
    getCurrentUser,
    isAuthenticated
  },
  storage: {
    uploadImage,
    deleteImage
  },
  files: {
    saveScheduleFile,
    loadScheduleFile,
    listScheduleFiles,
    deleteScheduleFile
  }
};

console.log('Supabase API module loaded');
