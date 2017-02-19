class ClientChannel < ApplicationCable::Channel
  def subscribed
    stop_all_streams
    puts "ay"
    game_session = GameSession.find(params[:game_session_id]) if params[:game_session_id]
    game_session ||= GameSession.create(game_id: 1, host_id: 1)
    puts "before stream"
    stream_from "hardcoded_name"
    puts "after stream"
  end

  def receive(data)
    puts "da fuq u want dawg"
    game_session = GameSession.find(params[:game_session_id]) if params[:game_session_id]
    game_session ||= GameSession.create(game_id: 1, host_id: 1)
    ActionCable.server.broadcast(game_session, data)
  end
end
