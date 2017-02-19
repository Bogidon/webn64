class HostChannel < ApplicationCable::Channel

  def follow(data)
    stop_all_streams
    puts data['game_uuid']

    stream_from "game_session:#{data['game_uuid']}:host"
  end

  def subscribed
    # this is a callback when a host is subscribed to the channel
  end

  def receive(data)
    # this is called whenever the channel receives a broadcast
    puts "host is receiving..."
    puts data
  end
end
