# Gunicorn configuration file for production
# Reference: https://docs.gunicorn.org/en/stable/configure.html#configuration-file

# Number of worker processes
workers = 4

# The type of workers to use
worker_class = 'uvicorn.workers.UvicornWorker'

# The socket to bind
bind = '0.0.0.0:10000'

# Maximum number of requests a worker will process before restarting
max_requests = 5000
max_requests_jitter = 500

# Timeout for worker processes to gracefully timeout
# Increase this if you have long-running requests
timeout = 120

# Keep-alive: seconds to wait for the next request
keepalive = 5

# Logging configuration
loglevel = 'info'
accesslog = '-'  # Log to stdout
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(L)s'
errorlog = '-'  # Log to stderr

# Preload the application code before forking worker processes
preload_app = True

# Set environment variables
# os.environ['ENV'] = 'production'

# Worker process name
proc_name = 'social_os_backend'
