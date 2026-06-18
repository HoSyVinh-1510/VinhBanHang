FROM ruby:3.2
WORKDIR /app

# Install dependencies
COPY Gemfile Gemfile.lock ./
RUN bundle install

# Copy application files
COPY . .

EXPOSE 5003

# Run the Sinatra application
CMD ["ruby", "app.rb", "-o", "0.0.0.0"]
