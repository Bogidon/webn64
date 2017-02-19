class HomepageController < ApplicationController
  def show
    uuid = cookies.signed[:uuid] ||= SecureRandom.uuid
    cookies.signed[:uuid] = uuid
  end
end
