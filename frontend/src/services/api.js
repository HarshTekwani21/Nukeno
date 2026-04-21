const API_BASE = import.meta.env.VITE_API_URL || '';

class APIError extends Error {
  constructor(message, status, code) {
    super(message)
    this.status = status
    this.code = code
    this.name = 'APIError'
  }
}

class APIClient {
  constructor() {
    this.baseURL = API_BASE
    this.timeout = 30000
    this.retries = 3
    this.retryDelay = 1000
    this.sessionId = `session_${Date.now()}`
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    
    const token = localStorage.getItem('nukeno_token')
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    }

    if (options.body && !(options.body instanceof FormData)) {
      config.body = JSON.stringify(options.body)
    } else if (options.body instanceof FormData) {
      delete config.headers['Content-Type']
      config.body = options.body
    }

    let lastError
    
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)
        
        const response = await fetch(url, {
          ...config,
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new APIError(
            errorData.detail || `HTTP ${response.status}`,
            response.status,
            'HTTP_ERROR'
          )
        }

        return await response.json()
        
      } catch (error) {
        lastError = error
        
        if (error.name === 'AbortError') {
          throw new APIError('Request timeout', 408, 'TIMEOUT')
        }
        
        if (attempt < this.retries) {
          await this.delay(this.retryDelay * (attempt + 1))
        }
      }
    }
    
    throw lastError
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async chat(message, sessionId = null, userId = null) {
    return this.request('/chat', {
      method: 'POST',
      body: { 
        message, 
        use_context: true,
        session_id: sessionId || this.sessionId,
        user_id: userId || this.sessionId
      }
    })
  }

  async voiceChat(audioBlob, sessionId = null) {
    const formData = new FormData()
    formData.append('audio', audioBlob, `audio_${Date.now()}.wav`)
    
    try {
      return await this.request('/voice-chat', {
        method: 'POST',
        body: formData
      })
    } catch (error) {
      console.error('Voice chat error:', error)
      return {
        transcript: '',
        response: 'Voice processing failed. Please try again.',
        audio_data: null,
        error: error.message
      }
    }
  }

  async getTasks() {
    return this.request('/tasks')
  }

  async createTask(task) {
    return this.request('/tasks', {
      method: 'POST',
      body: task
    })
  }

  async updateTask(taskId, updates) {
    return this.request(`/tasks/${taskId}`, {
      method: 'PUT',
      body: updates
    })
  }

  async deleteTask(taskId) {
    return this.request(`/tasks/${taskId}`, {
      method: 'DELETE'
    })
  }

  async getNotes() {
    return this.request('/notes')
  }

  async createNote(note) {
    return this.request('/notes', {
      method: 'POST',
      body: note
    })
  }

  async deleteNote(noteId) {
    return this.request(`/notes/${noteId}`, {
      method: 'DELETE'
    })
  }

  async getDailySummary() {
    return this.request('/daily-summary')
  }

  async healthCheck() {
    try {
      await this.request('/health')
      return true
    } catch {
      return false
    }
  }
}

export const api = new APIClient()
export { APIError }
