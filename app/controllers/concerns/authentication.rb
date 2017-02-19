module Authentication
  extend ActiveSupport::Concern

  included do
    before_action :assign_random_uuid
    # before_action :ensure_authenticated_client
  end

  private
    def assign_random_uuid
      puts "dafuq"
      uuid = SecureRandom.uuid
      Client.create(uuid: uuid)
      cookies.signed[:uuid] = uuid
    end

    def ensure_authenticated_client
      authenticate_client(cookies.signed[:client_id]) || redirect_to(new_session_url)
    end

    def authenticate_client(client_id)
      if authenticated_client = client.find_by(id: client_id)
        cookies.signed[:client_id] ||= client_id
        @current_client = authenticated_client
      end
    end

    def unauthenticate_client
      ActionCable.server.disconnect(current_client: @current_client)
      @current_client = nil
      cookies.delete(:client_id)
    end
end
