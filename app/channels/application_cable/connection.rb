module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :current_client

    def connect
      self.current_client = find_unverified_client
    end

    private
      def find_unverified_client
        puts "hello"
        puts cookies.signed[:uuid]
        current_client = Client.create(uuid: cookies.signed[:uuid])
      end

      def find_verified_client
        if current_client = Client.find_by(id: cookies.signed[:client_id])
          current_client
        else
          reject_unauthorized_connection
        end
      end
  end
end
