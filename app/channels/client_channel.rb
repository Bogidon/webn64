class ClientChannel < ApplicationCable::Channel

  def follow(data)
    stop_all_streams
    puts data['game_uuid']

    stream_from "game_session:#{data['game_uuid']}:client"
  end

  def subscribed
    # this is a callback when a host is subscribed to the channel
  end

  def receive(data)
    # this is called whenever the channel receives a broadcast
    puts "in client channel receive"
    puts data
    ActionCable.server.broadcast("game_session:#{data['game_uuid']}:host", data)
    puts "client broadcast to host"
  end
end
